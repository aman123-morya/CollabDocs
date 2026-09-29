package com.devansh.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Embeddable
public class UserDocId implements Serializable {

    @Column(name = "username", length = 30)
    private String username;

    @Column(name = "doc_id")
    private Long docId;
}
