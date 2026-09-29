package com.devansh.controller;

import com.devansh.dto.AccessDTO;
import com.devansh.dto.DocChangesDTO;
import com.devansh.dto.DocTitleDTO;
import com.devansh.dto.DocumentDTO;
import com.devansh.dto.ExportedDoc;
import com.devansh.dto.UserDocDTO;
import com.devansh.service.DocService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/docs")
@RequiredArgsConstructor
public class DocController {

    private final DocService docService;

    @PostMapping("/create")
    public DocumentDTO createDoc(@Valid @RequestBody DocTitleDTO title) {
        return docService.createDoc(title);
    }

    @DeleteMapping("/delete/{id}")
    public Long deleteDoc(@PathVariable Long id) {
        return docService.deleteDoc(id);
    }

    @PatchMapping("/rename/{id}")
    public String updateDocTitle(@PathVariable Long id, @Valid @RequestBody DocTitleDTO docTitleDTO) {
        return docService.updateDocTitle(id, docTitleDTO);
    }

    @PatchMapping("/users/add/{id}")
    public UserDocDTO addUser(@PathVariable Long id, @Valid @RequestBody UserDocDTO userDoc) {
        return docService.addUser(id, userDoc);
    }

    @GetMapping("/users/shared/{id}")
    public List<UserDocDTO> getSharedUsers(@PathVariable Long id) {
        return docService.getSharedUsers(id);
    }

    @DeleteMapping("/users/remove/{id}")
    public String removeUser(@PathVariable Long id, @Valid @RequestBody UserDocDTO userDoc) {
        return docService.removeUser(id, userDoc);
    }

    @PatchMapping("/users/permission/{id}")
    public String updatePermission(@PathVariable Long id, @Valid @RequestBody UserDocDTO userDoc) {
        return docService.updatePermission(id, userDoc);
    }

    /** Link sharing: PRIVATE / ANYONE_VIEW / ANYONE_EDIT. */
    @PatchMapping("/access/{id}")
    public DocumentDTO updateGeneralAccess(@PathVariable Long id, @Valid @RequestBody AccessDTO access) {
        return docService.updateGeneralAccess(id, access);
    }

    @GetMapping("/all")
    public List<DocumentDTO> getAllDocs() {
        return docService.getAllDocs();
    }

    @GetMapping("/changes/{id}")
    public DocChangesDTO getDocChanges(@PathVariable Long id) {
        return docService.getDocChanges(id);
    }

    @GetMapping("/{id}")
    public DocumentDTO getDoc(@PathVariable Long id) {
        return docService.getDoc(id);
    }

    /** Downloads the document's current text as a .txt file. */
    @GetMapping("/export/{id}")
    public ResponseEntity<byte[]> export(@PathVariable Long id) {
        ExportedDoc exported = docService.exportText(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + exported.filename() + "\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(exported.bytes());
    }
}
