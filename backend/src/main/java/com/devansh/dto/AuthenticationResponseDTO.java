package com.devansh.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthenticationResponseDTO {
    /** "Bearer &lt;jwt&gt;" - sent back as the Authorization header. */
    private String token;
    private String username;
    private String email;
}
