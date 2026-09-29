package com.devansh.event;

import com.devansh.dto.ActiveUsers;
import com.devansh.engine.CrdtManagerService;
import com.devansh.model.WebSocketSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.util.UriTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** Tracks who has which document open: drives the "active users" list and the last-one-out save. */
@Component
public class WebSocketEventListener {

    private static final UriTemplate CHANGES_TOPIC = new UriTemplate("/docs/broadcast/changes/{id}");

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private CrdtManagerService crdtManagerService;

    private final ConcurrentHashMap<String, WebSocketSession> socketSession = new ConcurrentHashMap<>();
    /** docId -> session ids (a Set: a re-subscribe must not count twice). */
    private final ConcurrentHashMap<String, Set<String>> docSessions = new ConcurrentHashMap<>();

    @EventListener
    private void handleSessionConnected(SessionConnectedEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headers.getSessionId();
        String username = getUsername(headers);
        if (sessionId != null && username != null) {
            socketSession.put(sessionId, new WebSocketSession(username, ""));
        }
    }

    @EventListener
    private void handleSessionSubscribe(SessionSubscribeEvent event) {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String docId = getDocId(headers);
        if (docId.isEmpty()) return;
        String sessionId = headers.getSessionId();
        WebSocketSession session = sessionId == null ? null : socketSession.get(sessionId);
        if (session == null) return;

        session.setDocId(docId);
        crdtManagerService.createCrdt(Long.parseLong(docId));
        docSessions.computeIfAbsent(docId, k -> ConcurrentHashMap.newKeySet()).add(sessionId);
        notifyActiveUsers(docId);
    }

    @EventListener
    private void handleSessionDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        WebSocketSession sessionData = socketSession.remove(sessionId);
        if (sessionData == null) return;
        String docId = sessionData.getDocId();
        Set<String> participants = docSessions.get(docId);
        if (participants == null) return;

        participants.remove(sessionId);
        if (participants.isEmpty()) {
            docSessions.remove(docId);
            crdtManagerService.saveAndDeleteCrdt(Long.parseLong(docId));
        } else {
            notifyActiveUsers(docId);
        }
    }

    private void notifyActiveUsers(String docId) {
        Set<String> participants = docSessions.get(docId);
        if (participants == null) return;

        List<String> usernames = participants.stream()
                .map(socketSession::get)
                .filter(s -> s != null)
                .map(WebSocketSession::getUsername)
                .distinct()                     // one person with two tabs is still one person
                .sorted()
                .toList();
        ActiveUsers activeUsers = new ActiveUsers();
        activeUsers.setUsernames(usernames);
        messagingTemplate.convertAndSend("/docs/broadcast/usernames/" + docId, activeUsers);
    }

    private String getUsername(SimpMessageHeaderAccessor headers) {
        return headers.getUser() == null ? null : headers.getUser().getName();
    }

    private String getDocId(SimpMessageHeaderAccessor headers) {
        String destination = headers.getDestination();
        if (destination == null) return "";
        Map<String, String> match = CHANGES_TOPIC.match(destination);
        return match.getOrDefault("id", "");
    }
}
