package com.devansh.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/docs");
        config.setApplicationDestinationPrefixes("/docs");
        config.setPreservePublishOrder(true);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.setPreserveReceiveOrder(true);
        registry.addEndpoint("/docs/ws")
                .setAllowedOriginPatterns(frontendUrl);      // only our own frontend may open sockets
    }

    // A single thread per channel keeps CRDT operations strictly ordered.
    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.taskExecutor().corePoolSize(1);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.taskExecutor().corePoolSize(1);
    }

}
