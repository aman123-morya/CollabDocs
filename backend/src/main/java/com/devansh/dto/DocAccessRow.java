package com.devansh.dto;

import com.devansh.enums.ShareOption;

/** Owner + link-sharing mode of a document; enough to resolve anyone's permission. */
public record DocAccessRow(String owner, ShareOption generalAccess) {
}
