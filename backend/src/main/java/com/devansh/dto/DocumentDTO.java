package com.devansh.dto;

import com.devansh.enums.Permission;
import com.devansh.enums.ShareOption;
import lombok.*;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DocumentDTO {
    private Long id;
    private String owner;
    private String title;
    private String preview;
    /** The calling user's effective permission on this document (OWNER / EDIT / VIEW). */
    private Permission permission;
    private ShareOption generalAccess;
    private Instant createdAt;
    private Instant updatedAt;
    private List<UserDocDTO> sharedWith;
}
