package com.devansh.enums;

/** Who (besides explicitly invited collaborators) may open a document. */
public enum ShareOption {
    /** Only the owner and invited collaborators. */
    PRIVATE,
    /** Any signed-in user with the link can read. */
    ANYONE_VIEW,
    /** Any signed-in user with the link can edit. */
    ANYONE_EDIT
}
