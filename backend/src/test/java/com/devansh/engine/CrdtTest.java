package com.devansh.engine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CrdtTest {

    private static Item item(Crdt c, String id, String ch, String left, String right) {
        return new Item(id, ch, c.getItem(right), c.getItem(left), "insert", false, false, false);
    }

    private static Crdt typed(String text, String client) {
        Crdt c = new Crdt();
        String prev = null;
        for (int i = 0; i < text.length(); i++) {
            String id = i + "@" + client;
            c.insert(item(c, id, text.substring(i, i + 1), prev, null));
            prev = id;
        }
        return c;
    }

    @Test
    void sequentialTypingMiddleInsertAndDelete() {
        Crdt c = typed("hello", "alice");
        assertEquals("hello", c.toString());
        c.insert(item(c, "5@alice", "X", "1@alice", "2@alice"));
        assertEquals("heXllo", c.toString());
        assertTrue(c.delete("0@alice"));
        assertEquals("eXllo", c.toString());
        assertFalse(c.delete("0@alice"), "second delete is a no-op");
        assertFalse(c.delete("missing"));
    }

    @Test
    void duplicateDeliveryIsIgnoredAndVersionCountsAppliedOperationsOnly() {
        Crdt c = typed("ab", "u");
        long v = c.getVersion();
        assertFalse(c.insert(item(c, "0@u", "a", null, null)));
        assertEquals(v, c.getVersion());
        c.format("0@u", true, false);
        assertEquals(v + 1, c.getVersion());
    }

    @Test
    void snapshotRoundTripKeepsTextFormattingAndEmoji() {
        String text = "Hi \uD83D\uDE00 \u0928\u092E\u0938\u094D\u0924\u0947\nend";
        Crdt c = new Crdt();
        String prev = null;
        int n = 0;
        for (int i = 0; i < text.length(); i++) {
            String id = (n++) + "@bob";
            Item it = item(c, id, String.valueOf(text.charAt(i)), prev, null);
            it.setIsbold(n <= 2);
            c.insert(it);
            prev = id;
        }
        Crdt.Snapshot snapshot = c.snapshot();
        Crdt restored = new Crdt(snapshot.bytes());
        assertEquals(text, restored.toString());
        assertTrue(restored.getItems().get(0).isIsbold());
        assertFalse(restored.getItems().get(3).isIsbold());
        assertEquals(text.length(), restored.getItems().size(), "one item per UTF-16 unit");
        assertEquals("Hi \uD83D\uDE00 \u0928\u092E\u0938\u094D\u0924\u0947 end", snapshot.preview());
    }

    @Test
    void concurrentInsertsAtTheSameSpotConvergeInAnyArrivalOrder() {
        Crdt a = new Crdt();
        Crdt b = new Crdt();
        a.insert(item(a, "0@alice", "A", null, null));
        a.insert(item(a, "0@bob", "B", null, null));
        b.insert(item(b, "0@bob", "B", null, null));
        b.insert(item(b, "0@alice", "A", null, null));
        assertEquals(a.toString(), b.toString());
    }

    @Test
    void largeDocumentSurvivesSnapshotRoundTrip() {
        // the previous Java-serialization based persistence overflowed the stack on a few thousand characters
        Crdt c = new Crdt();
        String prev = null;
        for (int i = 0; i < 50_000; i++) {
            String id = i + "@u";
            c.insert(item(c, id, String.valueOf((char) ('a' + i % 26)), prev, null));
            prev = id;
        }
        assertEquals(c.toString(), new Crdt(c.snapshot().bytes()).toString());
    }
}
