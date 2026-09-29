package com.devansh.dto;

import java.util.List;

/** Full document state for a joining client, plus the version it corresponds to. */
public record DocChangesDTO(long version, List<DocumentChangeDTO> items) {
}
