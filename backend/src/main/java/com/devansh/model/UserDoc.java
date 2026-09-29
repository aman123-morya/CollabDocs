package com.devansh.model;

import com.devansh.enums.Permission;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

/** A collaborator entry: (document, user, VIEW|EDIT). Stored in document_collaborators. */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "document_collaborators")
public class UserDoc {

    @EmbeddedId
    private UserDocId userDocId;

    @MapsId("username")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "username", referencedColumnName = "username")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @MapsId("docId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doc_id", referencedColumnName = "id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Doc doc;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission", nullable = false, length = 10)
    private Permission permission;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
