package com.devansh.engine;

import com.devansh.exception.DocumentNotFoundException;
import com.devansh.model.Doc;
import com.devansh.repo.DocRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Keeps the CRDT of every document that somebody currently has open in memory and writes
 * it back to PostgreSQL:
 * <ul>
 *   <li>periodically (autosave) while the document is being edited - a server crash loses at most a few seconds,</li>
 *   <li>when the last collaborator leaves,</li>
 *   <li>on application shutdown.</li>
 * </ul>
 */
@Service
public class CrdtManagerService {

    private static final Logger log = LoggerFactory.getLogger(CrdtManagerService.class);

    private final DocRepository docRepository;
    private final ConcurrentHashMap<Long, Crdt> crdtMap = new ConcurrentHashMap<>();
    private final Set<Long> dirty = ConcurrentHashMap.newKeySet();

    public CrdtManagerService(DocRepository docRepository) {
        this.docRepository = docRepository;
    }

    /** @return the loaded CRDT, or null if nobody has the document open */
    public Crdt getCrdt(Long docId) {
        return crdtMap.get(docId);
    }

    /** Loads the document from the database on first use. */
    public Crdt getOrCreate(Long docId) {
        Crdt existing = crdtMap.get(docId);
        if (existing != null) {
            return existing;
        }
        Doc doc = docRepository.getDocById(docId).orElseThrow(DocumentNotFoundException::new);
        Crdt loaded = new Crdt();
        loaded.InitCrdt(doc.getContent());
        Crdt raced = crdtMap.putIfAbsent(docId, loaded);
        return raced != null ? raced : loaded;
    }

    public void createCrdt(Long docId) {
        getOrCreate(docId);
    }

    public void markDirty(Long docId) {
        dirty.add(docId);
    }

    /** Writes the document if it changed since the last save. */
    public boolean save(Long docId) {
        Crdt crdt = crdtMap.get(docId);
        if (crdt == null || !dirty.remove(docId)) {
            return true;
        }
        try {
            Crdt.Snapshot snapshot = crdt.snapshot();
            docRepository.updateSnapshot(docId, snapshot.bytes(), snapshot.preview(), snapshot.chars(), Instant.now());
            return true;
        } catch (RuntimeException e) {
            dirty.add(docId);                       // try again on the next tick
            log.error("Could not save document {}", docId, e);
            return false;
        }
    }

    /** Called when the last collaborator leaves. The copy stays in memory if the save failed. */
    public void saveAndDeleteCrdt(Long docId) {
        if (save(docId)) {
            crdtMap.remove(docId);
        }
    }

    /** Document deleted: throw the in-memory state away without saving. */
    public void discard(Long docId) {
        dirty.remove(docId);
        crdtMap.remove(docId);
    }

    @Scheduled(fixedDelayString = "${app.autosave-interval-ms:15000}", initialDelayString = "${app.autosave-interval-ms:15000}")
    public void autosave() {
        for (Long docId : new ArrayList<>(dirty)) {
            save(docId);
        }
    }

    @PreDestroy
    void flushOnShutdown() {
        List<Long> ids = new ArrayList<>(dirty);
        for (Long docId : ids) {
            save(docId);
        }
        log.info("Flushed {} open document(s) before shutdown", ids.size());
    }
}
