package com.devansh.controller;

import com.devansh.dto.AuthenticationRequestDTO;
import com.devansh.dto.AuthenticationResponseDTO;
import com.devansh.dto.RegisterRequestDTO;
import com.devansh.service.AuthenticationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthenticationController {
    private final AuthenticationService authenticationService;

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponseDTO> register(@Valid @RequestBody RegisterRequestDTO registerRequestDTO) {
        return ResponseEntity.ok().body(authenticationService.register(registerRequestDTO));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponseDTO> authenticateUser(@Valid @RequestBody AuthenticationRequestDTO request) {
        return ResponseEntity.ok().body(authenticationService.authenticate(request));
    }

    /** Tokens are stateless; the client simply discards its copy. */
    @GetMapping("/logout")
    public ResponseEntity<Void> logout() {
        authenticationService.logout();
        return ResponseEntity.ok().build();
    }
}
