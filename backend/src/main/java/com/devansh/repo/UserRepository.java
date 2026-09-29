package com.devansh.repo;

import com.devansh.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUsername(String username);

    /** Login accepts either the username or the e-mail address, ignoring case. */
    Optional<User> findByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    /** Used by the "share" dialog auto-complete. */
    List<User> findTop8ByUsernameContainingIgnoreCaseOrderByUsernameAsc(String fragment);

    /** Targeted update: never rewrites the password column through a stale entity copy. */
    @Modifying
    @Transactional
    @Query("update User u set u.lastLoginAt = :now where u.username = :username")
    int touchLastLogin(@Param("username") String username, @Param("now") Instant now);
}
