package com.devansh.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthenticationRequestDTO {

    /** Username or e-mail address. */
    @NotBlank(message = "Username or email is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;

    private String email;
}
