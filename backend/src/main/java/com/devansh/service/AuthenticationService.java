package com.devansh.service;

import com.devansh.dto.AuthenticationRequestDTO;
import com.devansh.dto.AuthenticationResponseDTO;
import com.devansh.dto.RegisterRequestDTO;

public interface AuthenticationService {
    AuthenticationResponseDTO register(RegisterRequestDTO requestAuthenticationResponseDTO);
    AuthenticationResponseDTO authenticate(AuthenticationRequestDTO request);
    void logout();
}
