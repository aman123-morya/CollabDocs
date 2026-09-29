package com.devansh.config;

import com.devansh.service.DocAuthorizationService;
import com.devansh.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Collections;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketAuthenticationConfig implements WebSocketMessageBrokerConfigurer {

    private static final String BEARER = "Bearer ";
    private static final Pattern TOPIC = Pattern.compile("^/docs/broadcast/(?:changes|cursors|usernames)/(\\d+)$");

    @Autowired
    JwtService jwtService;

    @Autowired
    DocAuthorizationService authz;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) {
                    return message;
                }

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String header = accessor.getFirstNativeHeader("Authentication");
                    if (header == null || !header.startsWith(BEARER)) {
                        throw new MessagingException("Cannot open websocket: missing credentials");
                    }
                    String jwtToken = header.substring(BEARER.length());
                    boolean valid;
                    try {
                        valid = jwtService.validateUserAndToken(jwtToken);
                    } catch (RuntimeException e) {          // expired, malformed, unknown user ...
                        valid = false;
                    }
                    if (!valid) {
                        throw new MessagingException("Cannot open websocket: invalid or expired token");
                    }
                    String username = jwtService.extractUsername(jwtToken);
                    accessor.setUser(new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList()));
                }

                // only people who may read a document may listen to its edits, cursors and presence
                if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) && accessor.getDestination() != null) {
                    Matcher m = TOPIC.matcher(accessor.getDestination());
                    if (m.matches()) {
                        String username = accessor.getUser() == null ? null : accessor.getUser().getName();
                        if (!authz.resolveCached(username, Long.parseLong(m.group(1))).isPresent()) {
                            throw new MessagingException("You do not have access to this document");
                        }
                    }
                }
                return message;
            }
        });
    }
}
