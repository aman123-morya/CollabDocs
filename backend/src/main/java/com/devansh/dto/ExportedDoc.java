package com.devansh.dto;

/** Plain-text download of a document: a safe file name plus its UTF-8 bytes. */
public record ExportedDoc(String filename, byte[] bytes) {
}
