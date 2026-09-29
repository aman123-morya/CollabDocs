package com.devansh.repo;

import com.devansh.dto.DocAccessRow;
import com.devansh.dto.DocSummaryRow;
import com.devansh.model.Doc;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface DocRepository extends JpaRepository<Doc, Long> {

    /**
     * Dashboard listing: documents I own or that were shared with me, newest first.
     * Selects plain columns only, so the (potentially large) CRDT blob is never loaded.
     */
    @Query("""
            select new com.devansh.dto.DocSummaryRow(
                d.id, d.owner.username, d.title, d.preview, d.generalAccess, d.createdAt, d.updatedAt)
            from Doc d
            where d.owner.username = :username
               or d.id in (select ud.userDocId.docId from UserDoc ud where ud.userDocId.username = :username)
            order by d.updatedAt desc
            """)
    List<DocSummaryRow> findSummariesByUsername(@Param("username") String username);

    @Query("""
            select new com.devansh.dto.DocSummaryRow(
                d.id, d.owner.username, d.title, d.preview, d.generalAccess, d.createdAt, d.updatedAt)
            from Doc d
            where d.id = :id
            """)
    Optional<DocSummaryRow> findSummaryById(@Param("id") Long id);

    @Query("select new com.devansh.dto.DocAccessRow(d.owner.username, d.generalAccess) from Doc d where d.id = :id")
    Optional<DocAccessRow> findAccessRow(@Param("id") Long id);

    Optional<Doc> getDocById(Long id);

    /** Persists a CRDT snapshot without loading the entity first. */
    @Modifying
    @Transactional
    @Query("""
            update Doc d
               set d.content = :content, d.preview = :preview, d.charCount = :chars, d.updatedAt = :now
             where d.id = :id
            """)
    int updateSnapshot(@Param("id") Long id,
                       @Param("content") byte[] content,
                       @Param("preview") String preview,
                       @Param("chars") int chars,
                       @Param("now") Instant now);
}
