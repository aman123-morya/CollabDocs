package com.devansh.repo;

import com.devansh.dto.SharedRow;
import com.devansh.enums.Permission;
import com.devansh.model.UserDoc;
import com.devansh.model.UserDocId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserDocRepository extends JpaRepository<UserDoc, UserDocId> {

    @Modifying
    @Transactional
    @Query("delete from UserDoc ud where ud.userDocId.username = :username and ud.userDocId.docId = :docId")
    int deleteCollaborator(@Param("username") String username, @Param("docId") Long docId);

    @Modifying
    @Transactional
    @Query("update UserDoc ud set ud.permission = :permission where ud.userDocId.username = :username and ud.userDocId.docId = :docId")
    int updateCollaborator(@Param("username") String username,
                           @Param("docId") Long docId,
                           @Param("permission") Permission permission);

    /** Collaborators of many documents in a single query (avoids N+1 on the dashboard). */
    @Query("""
            select new com.devansh.dto.SharedRow(ud.userDocId.docId, ud.userDocId.username, ud.permission)
            from UserDoc ud
            where ud.userDocId.docId in :docIds
            order by ud.userDocId.username
            """)
    List<SharedRow> findSharedRows(@Param("docIds") Collection<Long> docIds);

    @Query("select ud.permission from UserDoc ud where ud.userDocId.docId = :docId and ud.userDocId.username = :username")
    Optional<Permission> findPermission(@Param("docId") Long docId, @Param("username") String username);
}
