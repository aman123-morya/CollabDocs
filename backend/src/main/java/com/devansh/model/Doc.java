package com.devansh.model;

import com.devansh.enums.ShareOption;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "documents")
public class Doc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_username", nullable = false)
    private User owner;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /** Binary CRDT snapshot (PostgreSQL bytea). */
    @Column(name = "content", nullable = false)
    @Builder.Default
    private byte[] content = new byte[0];

    @Column(name = "preview", nullable = false, length = 300)
    @Builder.Default
    private String preview = "";

    @Column(name = "char_count", nullable = false)
    private int charCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "general_access", nullable = false, length = 20)
    @Builder.Default
    private ShareOption generalAccess = ShareOption.PRIVATE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "doc")
    @Builder.Default
    private List<UserDoc> sharedWith = new ArrayList<>();
}
