package com.devansh.service;

import com.devansh.dto.AccessDTO;
import com.devansh.dto.DocChangesDTO;
import com.devansh.dto.DocTitleDTO;
import com.devansh.dto.DocumentDTO;
import com.devansh.dto.ExportedDoc;
import com.devansh.dto.UserDocDTO;

import java.util.List;

public interface DocService {
    DocumentDTO createDoc(DocTitleDTO title);
    Long deleteDoc(Long id);
    String updateDocTitle(Long id, DocTitleDTO documentDTO);
    UserDocDTO addUser(Long id, UserDocDTO userDoc);
    List<UserDocDTO> getSharedUsers(Long id);
    String removeUser(Long id, UserDocDTO userDoc);
    String updatePermission(Long id, UserDocDTO userDoc);
    DocumentDTO updateGeneralAccess(Long id, AccessDTO access);
    List<DocumentDTO> getAllDocs();
    DocChangesDTO getDocChanges(Long id);
    DocumentDTO getDoc(Long id);
    ExportedDoc exportText(Long id);
}
