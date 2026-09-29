package com.devansh.service;

import com.devansh.dto.AccessDTO;
import com.devansh.dto.DocSummaryRow;
import com.devansh.dto.DocChangesDTO;
import com.devansh.dto.DocTitleDTO;
import com.devansh.dto.DocumentDTO;
import com.devansh.dto.ExportedDoc;
import com.devansh.dto.SharedRow;
import com.devansh.dto.UserDocDTO;
import com.devansh.engine.Crdt;
import com.devansh.engine.CrdtManagerService;
import com.devansh.enums.Permission;
import com.devansh.enums.ShareOption;
import com.devansh.exception.DocumentNotFoundException;
import com.devansh.exception.UnauthorizedUserException;
import com.devansh.exception.UserNotFoundException;
import com.devansh.mapper.DocumentChangeMapper;
import com.devansh.model.Doc;
import com.devansh.model.User;
import com.devansh.model.UserDoc;
import com.devansh.model.UserDocId;
import com.devansh.repo.DocRepository;
import com.devansh.repo.UserDocRepository;
import com.devansh.repo.UserRepository;
import com.devansh.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DocServiceImpl implements DocService {

    private static final String DEFAULT_TITLE = "Untitled document";

    private final DocRepository docRepository;
    private final UserRepository userRepository;
    private final UserDocRepository userDocRepository;
    private final DocumentChangeMapper documentChangeMapper;
    private final CrdtManagerService crdtManagerService;
    private final DocAuthorizationService authz;

    // ------------------------------------------------------------ helpers

    private static String me() {
        return SecurityUtil.getCurrentUsername();
    }

    private Doc requireDoc(Long id) {
        return docRepository.findById(id).orElseThrow(DocumentNotFoundException::new);
    }

    private static String cleanTitle(String raw) {
        String title = raw == null ? "" : raw.trim();
        return title.isEmpty() ? DEFAULT_TITLE : title;
    }

    private static UserDocDTO toDto(SharedRow row) {
        return new UserDocDTO(row.username(), row.permission());
    }

    // ---------------------------------------------------------- documents

    @Transactional
    @Override
    public DocumentDTO createDoc(DocTitleDTO docTitleDTO) {
        User user = userRepository.findById(me()).orElseThrow(UserNotFoundException::new);
        Doc saved = docRepository.save(Doc.builder()
                .owner(user)
                .title(cleanTitle(docTitleDTO.getTitle()))
                .build());
        return DocumentDTO.builder()
                .id(saved.getId())
                .owner(user.getUsername())
                .title(saved.getTitle())
                .preview("")
                .permission(Permission.OWNER)
                .generalAccess(saved.getGeneralAccess())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .sharedWith(new ArrayList<>())
                .build();
    }

    @Transactional
    @Override
    public Long deleteDoc(Long id) {
        requireDoc(id);
        if (!authz.isOwner(me(), id)) {
            throw new UnauthorizedUserException("Only the owner can delete this document");
        }
        crdtManagerService.discard(id);
        docRepository.deleteById(id);
        authz.invalidate(id);
        return id;
    }

    @Transactional
    @Override
    public String updateDocTitle(Long id, DocTitleDTO title) {
        Doc doc = requireDoc(id);
        if (!authz.canEdit(me(), id)) {
            throw new UnauthorizedUserException("You do not have permission to rename this document");
        }
        doc.setTitle(cleanTitle(title.getTitle()));
        docRepository.save(doc);
        return "Title updated successfully";
    }

    @Transactional(readOnly = true)
    @Override
    public List<DocumentDTO> getAllDocs() {
        String username = me();
        List<DocSummaryRow> rows = docRepository.findSummariesByUsername(username);
        if (rows.isEmpty()) {
            return new ArrayList<>();
        }
        List<Long> ids = rows.stream().map(DocSummaryRow::id).toList();
        Map<Long, List<UserDocDTO>> sharedByDoc = new HashMap<>();
        for (SharedRow s : userDocRepository.findSharedRows(ids)) {
            sharedByDoc.computeIfAbsent(s.docId(), k -> new ArrayList<>()).add(toDto(s));
        }

        List<DocumentDTO> result = new ArrayList<>(rows.size());
        for (DocSummaryRow row : rows) {
            List<UserDocDTO> shared = sharedByDoc.getOrDefault(row.id(), new ArrayList<>());
            result.add(toDocumentDto(row, shared, username));
        }
        return result;
    }

    @Transactional(readOnly = true)
    @Override
    public DocumentDTO getDoc(Long id) {
        String username = me();
        DocSummaryRow row = docRepository.findSummaryById(id).orElseThrow(DocumentNotFoundException::new);
        if (!authz.canView(username, id)) {
            throw new UnauthorizedUserException("You do not have access to this document");
        }
        List<UserDocDTO> shared = userDocRepository.findSharedRows(List.of(id)).stream()
                .map(DocServiceImpl::toDto).toList();
        return toDocumentDto(row, new ArrayList<>(shared), username);
    }

    @Transactional(readOnly = true)
    @Override
    public ExportedDoc exportText(Long id) {
        Doc doc = requireDoc(id);
        if (!authz.canView(me(), id)) {
            throw new UnauthorizedUserException("You do not have access to this document");
        }
        Crdt crdt = crdtManagerService.getCrdt(id);
        String text = crdt != null ? crdt.toString() : new Crdt(doc.getContent()).toString();

        String safe = doc.getTitle().replaceAll("[^A-Za-z0-9 _-]", "").trim();
        if (safe.isEmpty()) {
            safe = "document";
        } else if (safe.length() > 60) {
            safe = safe.substring(0, 60).trim();
        }
        return new ExportedDoc(safe + ".txt", text.getBytes(StandardCharsets.UTF_8));
    }

    private DocumentDTO toDocumentDto(DocSummaryRow row, List<UserDocDTO> shared, String username) {
        Permission mine;
        if (row.owner().equals(username)) {
            mine = Permission.OWNER;
        } else {
            mine = shared.stream()
                    .filter(u -> u.getUsername().equals(username))
                    .map(UserDocDTO::getPermission)
                    .findFirst()
                    .orElse(null);
            if (row.generalAccess() == ShareOption.ANYONE_EDIT) {
                mine = Permission.EDIT;
            } else if (mine == null && row.generalAccess() == ShareOption.ANYONE_VIEW) {
                mine = Permission.VIEW;
            }
        }
        return DocumentDTO.builder()
                .id(row.id())
                .owner(row.owner())
                .title(row.title())
                .preview(row.preview())
                .permission(mine)
                .generalAccess(row.generalAccess())
                .createdAt(row.createdAt())
                .updatedAt(row.updatedAt())
                .sharedWith(shared)
                .build();
    }

    @Transactional(readOnly = true)
    @Override
    public DocChangesDTO getDocChanges(Long id) {
        requireDoc(id);
        if (!authz.canView(me(), id)) {
            throw new UnauthorizedUserException("You do not have access to this document");
        }
        Crdt crdt = crdtManagerService.getCrdt(id);
        if (crdt == null) {
            crdt = new Crdt(requireDoc(id).getContent());
        }
        // items and version must describe the same instant: hold the CRDT's monitor while mapping
        synchronized (crdt) {
            return new DocChangesDTO(crdt.getVersion(), documentChangeMapper.toDto(crdt.getItems()));
        }
    }

    // ------------------------------------------------------------ sharing

    @Transactional
    @Override
    public UserDocDTO addUser(Long id, UserDocDTO userDocDTO) {
        Doc doc = requireDoc(id);
        String username = me();
        if (!authz.canEdit(username, id)) {
            throw new UnauthorizedUserException("You do not have permission to share this document");
        }
        validatePermission(userDocDTO);
        String target = userDocDTO.getUsername().trim();
        User user = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(target, target)
                .orElseThrow(() -> new UserNotFoundException("No user named '" + target + "'"));
        if (user.getUsername().equals(doc.getOwner().getUsername())) {
            throw new IllegalArgumentException("That user already owns this document");
        }
        UserDoc userDoc = UserDoc.builder()
                .userDocId(UserDocId.builder().docId(doc.getId()).username(user.getUsername()).build())
                .user(user)
                .doc(doc)
                .permission(userDocDTO.getPermission())
                .build();
        userDocRepository.save(userDoc);
        authz.invalidate(id);
        return new UserDocDTO(user.getUsername(), userDocDTO.getPermission());
    }

    @Transactional(readOnly = true)
    @Override
    public List<UserDocDTO> getSharedUsers(Long id) {
        requireDoc(id);
        if (!authz.canView(me(), id)) {
            throw new UnauthorizedUserException("You do not have access to this document");
        }
        return userDocRepository.findSharedRows(List.of(id)).stream().map(DocServiceImpl::toDto).toList();
    }

    @Transactional
    @Override
    public String removeUser(Long id, UserDocDTO userDocDTO) {
        requireDoc(id);
        if (!authz.isOwner(me(), id)) {
            throw new UnauthorizedUserException("Only the owner can remove people from this document");
        }
        int removed = userDocRepository.deleteCollaborator(userDocDTO.getUsername(), id);
        authz.invalidate(id);
        return removed != 0 ? "User removed successfully" : "User not found";
    }

    @Transactional
    @Override
    public String updatePermission(Long id, UserDocDTO userDocDTO) {
        validatePermission(userDocDTO);
        requireDoc(id);
        if (!authz.isOwner(me(), id)) {
            throw new UnauthorizedUserException("Only the owner can change permissions");
        }
        int updated = userDocRepository.updateCollaborator(userDocDTO.getUsername(), id, userDocDTO.getPermission());
        authz.invalidate(id);
        return updated != 0 ? "User updated successfully" : "Failed to update";
    }

    @Transactional
    @Override
    public DocumentDTO updateGeneralAccess(Long id, AccessDTO access) {
        Doc doc = requireDoc(id);
        if (!authz.isOwner(me(), id)) {
            throw new UnauthorizedUserException("Only the owner can change link sharing");
        }
        doc.setGeneralAccess(access.getGeneralAccess());
        docRepository.save(doc);
        authz.invalidate(id);
        return getDoc(id);
    }

    private void validatePermission(UserDocDTO dto) {
        Permission p = dto.getPermission();
        if (p != Permission.VIEW && p != Permission.EDIT) {
            throw new IllegalArgumentException("Permission must be VIEW or EDIT");
        }
    }
}
