package com.devansh.model;

import lombok.*;

@Data
@AllArgsConstructor
public class WebSocketSession {
    private String username;
    private String docId;
}
