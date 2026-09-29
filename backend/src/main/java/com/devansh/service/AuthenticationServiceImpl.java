package com.devansh.service;

import com.devansh.dto.AuthenticationRequestDTO;
import com.devansh.dto.AuthenticationResponseDTO;
import com.devansh.dto.RegisterRequestDTO;
import com.devansh.enums.Role;
import com.devansh.exception.UserAlreadyExistException;
import com.devansh.model.User;
import com.devansh.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Override
    public AuthenticationResponseDTO register(RegisterRequestDTO request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new UserAlreadyExistException("The username '" + username + "' is already taken");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new UserAlreadyExistException("An account with this email already exists");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .lastLoginAt(Instant.now())
                .build();
        userRepository.save(user);
        return tokenFor(user);
    }

    @Override
    public AuthenticationResponseDTO authenticate(AuthenticationRequestDTO request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername().trim(), request.getPassword()));
        // the principal carries the canonical username (the user may have typed an e-mail or other letter case)
        User user = (User) authentication.getPrincipal();
        userRepository.touchLastLogin(user.getUsername(), Instant.now());
        return tokenFor(user);
    }

    @Override
    public void logout() {
        // stateless JWT: nothing to invalidate on the server
    }

    private AuthenticationResponseDTO tokenFor(User user) {
        return AuthenticationResponseDTO.builder()
                .token("Bearer " + jwtService.generateToken(user.getUsername()))
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }
}
