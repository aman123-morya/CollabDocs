package com.devansh.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RegisterRequestDTO {

    @NotBlank(message = "Username is required")
    @Pattern(regexp = "^[A-Za-z0-9_.-]{3,30}$",
            message = "Username must be 3-30 characters: letters, numbers, dot, dash or underscore")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be 8-72 characters")
    private String password;

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    @Size(max = 255, message = "Email is too long")
    private String email;
}
