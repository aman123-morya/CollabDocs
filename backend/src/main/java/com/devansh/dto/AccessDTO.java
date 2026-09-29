package com.devansh.dto;

import com.devansh.enums.ShareOption;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccessDTO {
    @NotNull(message = "Access level is required")
    private ShareOption generalAccess;
}
