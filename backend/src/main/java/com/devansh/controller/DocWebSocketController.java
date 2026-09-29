package com.devansh.controller;

import com.devansh.dto.CursorDTO;
import com.devansh.dto.DocumentChangeDTO;
import com.devansh.engine.Crdt;
import com.devansh.engine.CrdtManagerService;
import com.devansh.engine.Item;
import com.devansh.enums.Permission;
import com.devansh.service.DocAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Optional;

@Controller
@RequiredArgsConstructor
public class DocWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(DocWebSocketController.class);

    private final CrdtManagerService crdtManagerService;
    private final SimpMessagingTemplate messagingTemplate;
    private final DocAuthorizationService authz;

    /** A single CRDT operation (insert / delete / format) coming from one collaborator. */
    @MessageMapping("/change/{id}")
    public void change(@DestinationVariable String id, DocumentChangeDTO message, Principal principal) {
        Long docId = parseId(id);
        if (docId == null || principal == null || message == null || message.getId() == null
                || message.getOperation() == null) {
            return;
        }
        Optional<Permission> permission = authz.resolveCached(principal.getName(), docId);
        if (permission.isEmpty() || permission.get() == Permission.VIEW) {
            log.warn("Rejected edit on document {} from {}: read-only or no access", docId, principal.getName());
            return;
        }

        Crdt crdt = crdtManagerService.getOrCreate(docId);
        boolean applied;
        switch (message.getOperation()) {
            case "insert" -> applied = applyInsert(crdt, message);
            case "delete" -> applied = crdt.delete(message.getId());
            case "format" -> applied = crdt.format(message.getId(), message.getIsBold(), message.getIsItalic());
            default -> applied = false;
        }
        if (!applied) {
            return;             // duplicate, unknown id or malformed: never broadcast garbage
        }
        crdtManagerService.markDirty(docId);
        message.setSeq(crdt.getVersion());
        messagingTemplate.convertAndSend("/docs/broadcast/changes/" + id, message);
    }

    private boolean applyInsert(Crdt crdt, DocumentChangeDTO m) {
        String content = m.getContent();
        // exactly one UTF-16 unit per item keeps editor indexes and item ids aligned
        if (content == null || content.length() != 1) {
            log.warn("Rejected insert {}: content must be exactly one character", m.getId());
            return false;
        }
        if ((m.getLeft() != null && crdt.getItem(m.getLeft()) == null)
                || (m.getRight() != null && crdt.getItem(m.getRight()) == null)) {
            log.warn("Rejected insert {}: unknown neighbour", m.getId());
            return false;
        }
        Item item = new Item(m.getId(), content, crdt.getItem(m.getRight()), crdt.getItem(m.getLeft()),
                "insert", m.getIsDeleted(), m.getIsBold(), m.getIsItalic());
        return crdt.insert(item);
    }

    @MessageMapping("/cursor/{id}")
    public void cursor(@DestinationVariable String id, CursorDTO message, Principal principal) {
        Long docId = parseId(id);
        if (docId == null || principal == null || message == null
                || authz.resolveCached(principal.getName(), docId).isEmpty()) {
            return;
        }
        message.setUsername(principal.getName());      // never trust a client-supplied name
        messagingTemplate.convertAndSend("/docs/broadcast/cursors/" + id, message);
    }

    private static Long parseId(String id) {
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
