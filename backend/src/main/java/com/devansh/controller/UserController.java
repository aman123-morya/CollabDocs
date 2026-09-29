package com.devansh.controller;

import com.devansh.dto.ProfileDTO;
import com.devansh.dto.UserDTO;
import com.devansh.exception.UserNotFoundException;
import com.devansh.model.User;
import com.devansh.repo.UserRepository;
import com.devansh.security.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /** Who am I?  Also lets the frontend verify a stored token on start-up. */
    @GetMapping("/me")
    public ProfileDTO me() {
        User user = userRepository.findById(SecurityUtil.getCurrentUsername())
                .orElseThrow(UserNotFoundException::new);
        return ProfileDTO.builder()
                .username(user.getUsername())
                .email(user.getEmail())
                .createdAt(user.getCreatedAt())
                .build();
    }

    /** Username auto-complete for the share dialog. Returns usernames only. */
    @GetMapping("/search")
    public List<UserDTO> search(@RequestParam("q") String q) {
        String fragment = q == null ? "" : q.trim();
        if (fragment.length() < 2 || fragment.length() > 30) {
            return List.of();
        }
        String me = SecurityUtil.getCurrentUsername();
        return userRepository.findTop8ByUsernameContainingIgnoreCaseOrderByUsernameAsc(fragment).stream()
                .filter(u -> !u.getUsername().equals(me))
                .map(u -> new UserDTO(u.getUsername()))
                .toList();
    }
}
