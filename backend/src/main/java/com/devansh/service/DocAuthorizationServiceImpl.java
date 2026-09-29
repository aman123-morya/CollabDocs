package com.devansh.service;

import com.devansh.dto.DocAccessRow;
import com.devansh.enums.Permission;
import com.devansh.enums.ShareOption;
import com.devansh.repo.DocRepository;
import com.devansh.repo.UserDocRepository;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
public class DocAuthorizationServiceImpl implements DocAuthorizationService {

    private final DocRepository docRepository;
    private final UserDocRepository userDocRepository;

    /** key = "docId:username". Guava caches cannot hold null, hence Optional. */
    private final Cache<String, Optional<Permission>> cache = CacheBuilder.newBuilder()
            .expireAfterWrite(10, TimeUnit.SECONDS)
            .maximumSize(10_000)
            .build();

    public DocAuthorizationServiceImpl(DocRepository docRepository, UserDocRepository userDocRepository) {
        this.docRepository = docRepository;
        this.userDocRepository = userDocRepository;
    }

    @Override
    public Optional<Permission> resolve(String username, Long docId) {
        if (username == null || username.isEmpty() || docId == null) {
            return Optional.empty();
        }
        Optional<DocAccessRow> row = docRepository.findAccessRow(docId);
        if (row.isEmpty()) {
            return Optional.empty();
        }
        if (row.get().owner().equals(username)) {
            return Optional.of(Permission.OWNER);
        }
        Permission best = userDocRepository.findPermission(docId, username).orElse(null);
        ShareOption general = row.get().generalAccess();
        if (general == ShareOption.ANYONE_EDIT) {
            best = Permission.EDIT;
        } else if (general == ShareOption.ANYONE_VIEW && best == null) {
            best = Permission.VIEW;
        }
        return Optional.ofNullable(best);
    }

    @Override
    public Optional<Permission> resolveCached(String username, Long docId) {
        String key = docId + ":" + username;
        Optional<Permission> hit = cache.getIfPresent(key);
        if (hit != null) {
            return hit;
        }
        Optional<Permission> fresh = resolve(username, docId);
        cache.put(key, fresh);
        return fresh;
    }

    @Override
    public void invalidate(Long docId) {
        String prefix = docId + ":";
        cache.asMap().keySet().removeIf(k -> k.startsWith(prefix));
    }
}
