package com.devansh.dto;

import com.devansh.enums.Permission;

public record SharedRow(Long docId, String username, Permission permission) {
}
