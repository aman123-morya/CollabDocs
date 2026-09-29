package com.devansh.engine;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/**
 * In-memory CRDT of one document: a doubly linked list of single-character {@link Item}s
 * (deleted characters stay as tombstones so concurrent operations can still refer to them).
 *
 * <p>Every public method is synchronized: WebSocket handler threads mutate the list while the
 * autosave thread takes snapshots.
 *
 * <p>Items are single UTF-16 units (an emoji is two items) so that item index == editor index.
 *
 * <p>Persistence format ("CRDT" v1) - a flat run-length encoding, NOT Java serialization:
 * <pre>
 *   int   magic  0x43524454 ("CRDT")
 *   byte  version (1)
 *   int   run count
 *   run*: byte flags (bit0 = bold, bit1 = italic) | int byteLength | UTF-8 text
 * </pre>
 * Only visible characters are stored, so tombstones are garbage-collected on every save.
 * The old format serialized the linked list recursively and overflowed the stack on documents
 * of a few thousand characters.
 */
public class Crdt {

    private static final int MAGIC = 0x43524454;
    private static final byte VERSION = 1;
    private static final int PREVIEW_LENGTH = 200;

    private HashMap<String, Item> crdtMap = new HashMap<>();
    private Item firstItem;
    /** Number of operations applied since this instance was loaded; lets clients detect missed messages. */
    private long version;

    /** Result of {@link #snapshot()}. */
    public record Snapshot(byte[] bytes, String preview, int chars) {
    }

    public Crdt() {
    }

    public Crdt(byte[] bytes) {
        InitCrdt(bytes);
    }

    // ------------------------------------------------------------------ loading

    public synchronized void InitCrdt(byte[] bytes) {
        crdtMap = new HashMap<>();
        firstItem = null;
        if (bytes == null || bytes.length == 0) {
            return;
        }
        try (DataInputStream in = new DataInputStream(new ByteArrayInputStream(bytes))) {
            if (in.readInt() != MAGIC) {
                throw new IOException("Unknown document format");
            }
            byte version = in.readByte();
            if (version != VERSION) {
                throw new IOException("Unsupported document version " + version);
            }
            int runs = in.readInt();
            Item previous = null;
            int counter = 0;
            for (int r = 0; r < runs; r++) {
                int flags = in.readUnsignedByte();
                byte[] raw = new byte[in.readInt()];
                in.readFully(raw);
                String text = new String(raw, StandardCharsets.UTF_8);
                // one item per UTF-16 unit: identical to how the browser editor indexes text
                for (int i = 0; i < text.length(); i++) {
                    Item item = new Item(counter++ + "@_", String.valueOf(text.charAt(i)));
                    item.setIsbold((flags & 1) != 0);
                    item.setIsitalic((flags & 2) != 0);
                    item.setLeft(previous);
                    if (previous != null) {
                        previous.setRight(item);
                    } else {
                        firstItem = item;
                    }
                    crdtMap.put(item.getId(), item);
                    previous = item;
                }
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read document content", e);
        }
    }

    // --------------------------------------------------------------- operations

    public synchronized long getVersion() {
        return version;
    }

    public synchronized Item getItem(String id) {
        return id == null ? null : crdtMap.get(id);
    }

    /**
     * Integrates a remote insert. {@code item.left/right} are the neighbours the author saw.
     * Concurrent inserts at the same spot are ordered deterministically by client id, which is
     * exactly the rule the browser applies, so every replica converges.
     *
     * @return false if the item was a duplicate delivery and was ignored
     */
    public synchronized boolean insert(Item item) {
        if (crdtMap.containsKey(item.getId())) {
            return false;
        }
        Item left = item.getLeft();
        Item right = item.getRight();
        String mine = clientOf(item.getId());

        if (left == null) {
            boolean someoneInsertedAtHeadFirst = firstItem != null && right != firstItem
                    && clientOf(firstItem.getId()).compareTo(mine) > 0;
            if (!someoneInsertedAtHeadFirst) {
                item.setLeft(null);
                item.setRight(firstItem);
                if (firstItem != null) {
                    firstItem.setLeft(item);
                }
                firstItem = item;
                crdtMap.put(item.getId(), item);
                version++;
                return true;
            }
            left = firstItem;
        }

        while (left.getRight() != right && left.getRight() != null
                && clientOf(left.getRight().getId()).compareTo(mine) > 0) {
            left = left.getRight();
        }

        Item next = left.getRight();
        item.setLeft(left);
        item.setRight(next);
        left.setRight(item);
        if (next != null) {
            next.setLeft(item);
        }
        crdtMap.put(item.getId(), item);
        version++;
        return true;
    }

    /** @return false if the id is unknown or already deleted */
    public synchronized boolean delete(String key) {
        Item item = crdtMap.get(key);
        if (item == null || item.isIsdeleted()) {
            return false;
        }
        item.setIsdeleted(true);
        item.setOperation("delete");
        version++;
        return true;
    }

    /** @return false if the id is unknown */
    public synchronized boolean format(String key, boolean bold, boolean italic) {
        Item item = crdtMap.get(key);
        if (item == null) {
            return false;
        }
        item.setIsbold(bold);
        item.setIsitalic(italic);
        version++;
        return true;
    }

    // ------------------------------------------------------------------- reading

    @Override
    public synchronized String toString() {
        StringBuilder sb = new StringBuilder();
        for (Item current = firstItem; current != null; current = current.getRight()) {
            if (!current.isIsdeleted()) {
                sb.append(current.getContent());
            }
        }
        return sb.toString();
    }

    /** All items in document order, including tombstones (what a joining client needs). */
    public synchronized List<Item> getItems() {
        List<Item> items = new ArrayList<>(crdtMap.size());
        for (Item current = firstItem; current != null; current = current.getRight()) {
            items.add(current);
        }
        return items;
    }

    // -------------------------------------------------------------- persistence

    public synchronized Snapshot snapshot() {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        StringBuilder text = new StringBuilder();
        try (DataOutputStream out = new DataOutputStream(bos)) {
            List<int[]> flagsPerRun = new ArrayList<>();
            List<byte[]> textPerRun = new ArrayList<>();

            StringBuilder run = new StringBuilder();
            int runFlags = -1;
            for (Item current = firstItem; current != null; current = current.getRight()) {
                if (current.isIsdeleted()) {
                    continue;
                }
                int flags = (current.isIsbold() ? 1 : 0) | (current.isIsitalic() ? 2 : 0);
                boolean splitsSurrogatePair = run.length() > 0 && Character.isHighSurrogate(run.charAt(run.length() - 1))
                        && current.getContent().length() == 1 && Character.isLowSurrogate(current.getContent().charAt(0));
                if (flags != runFlags && run.length() > 0 && !splitsSurrogatePair) {
                    flagsPerRun.add(new int[]{runFlags});
                    textPerRun.add(run.toString().getBytes(StandardCharsets.UTF_8));
                    run.setLength(0);
                }
                runFlags = flags;
                run.append(current.getContent());
                text.append(current.getContent());
            }
            if (run.length() > 0) {
                flagsPerRun.add(new int[]{runFlags});
                textPerRun.add(run.toString().getBytes(StandardCharsets.UTF_8));
            }

            out.writeInt(MAGIC);
            out.writeByte(VERSION);
            out.writeInt(flagsPerRun.size());
            for (int i = 0; i < flagsPerRun.size(); i++) {
                out.writeByte(flagsPerRun.get(i)[0]);
                out.writeInt(textPerRun.get(i).length);
                out.write(textPerRun.get(i));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to serialize document", e);
        }
        String full = text.toString();
        return new Snapshot(bos.toByteArray(), previewOf(full), full.length());
    }

    public byte[] getSerializedCrdt() {
        return snapshot().bytes();
    }

    // ------------------------------------------------------------------ helpers

    private static String previewOf(String text) {
        String flat = text.replaceAll("\\s+", " ").trim();
        if (flat.length() <= PREVIEW_LENGTH) {
            return flat;
        }
        int end = PREVIEW_LENGTH;
        if (Character.isHighSurrogate(flat.charAt(end - 1))) {
            end--;                          // never cut an emoji in half
        }
        return flat.substring(0, end);
    }

    /** "12@alice" -> "alice". Ids without '@' sort by the whole id. */
    private static String clientOf(String id) {
        int at = id.indexOf('@');
        return at < 0 ? id : id.substring(at + 1);
    }
}
