package com.devansh.dto;

import com.devansh.enums.ShareOption;

import java.time.Instant;

/** Lightweight projection used by the dashboard query (no binary content loaded). */
public record DocSummaryRow(
        Long id,
        String owner,
        String title,
        String preview,
        ShareOption generalAccess,
        Instant createdAt,
        Instant updatedAt
) {
}
