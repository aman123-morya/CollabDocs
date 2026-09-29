package com.devansh.service;

import com.devansh.enums.Permission;

import java.util.Optional;

/**
 * Single place that answers "what may this user do with this document?".
 * OWNER > EDIT > VIEW; an empty result means no access at all.
 */
public interface DocAuthorizationService {

    /** Effective permission straight from the database. */
    Optional<Permission> resolve(String username, Long docId);

    /** Same, but cached for a few seconds - used on the hot WebSocket path (every keystroke). */
    Optional<Permission> resolveCached(String username, Long docId);

    /** Forget cached decisions for a document (call after sharing changes). */
    void invalidate(Long docId);

    default boolean canView(String username, Long docId) {
        return resolve(username, docId).isPresent();
    }

    default boolean canEdit(String username, Long docId) {
        return resolve(username, docId).map(p -> p == Permission.EDIT || p == Permission.OWNER).orElse(false);
    }

    default boolean isOwner(String username, Long docId) {
        return resolve(username, docId).map(p -> p == Permission.OWNER).orElse(false);
    }
}
