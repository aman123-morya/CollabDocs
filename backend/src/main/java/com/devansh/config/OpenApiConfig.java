package com.devansh.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

/** Powers /swagger-ui.html. Paste a token (without "Bearer ") into the Authorize dialog to try authenticated endpoints. */
@OpenAPIDefinition(
        info = @Info(title = "CollabDocs API", version = "v1", description = "Real-time collaborative document editor"),
        security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
