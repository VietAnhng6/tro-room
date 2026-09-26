package com.troroom.backend.controller;
import com.troroom.backend.dto.LoginRequest;
import com.troroom.backend.dto.LoginResponse;
import com.troroom.backend.dto.RefreshTokenRequest;
import com.troroom.backend.dto.RegisterRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.AuthService;
import com.troroom.backend.service.RefreshTokenService;
import com.troroom.backend.entity.RefreshToken;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final com.troroom.backend.service.PermissionService permissionService;

public AuthController(
        AuthService authService,
        RefreshTokenService refreshTokenService,
        com.troroom.backend.service.PermissionService permissionService
) {
    this.authService = authService;
    this.refreshTokenService = refreshTokenService;
    this.permissionService = permissionService;
}

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request) {

        try {
            User user = authService.register(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body("Đăng ký thành công");

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
    @PostMapping("/login")
public ResponseEntity<?> login(
        @Valid @RequestBody LoginRequest request) {

    try {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    } catch (RuntimeException e) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(e.getMessage());
    }
}
@PostMapping("/refresh")
public ResponseEntity<?> refresh(
        @Valid @RequestBody RefreshTokenRequest request) {

    try {
        LoginResponse response =
                authService.refreshAccessToken(
                        request.getRefreshToken()
                );

        return ResponseEntity.ok(response);

    } catch (RuntimeException e) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(e.getMessage());
    }
    }
    @PostMapping("/logout")
public ResponseEntity<?> logout(
        @Valid @RequestBody RefreshTokenRequest request) {

    try {
        RefreshToken refreshToken =
                refreshTokenService.getValidRefreshToken(
                        request.getRefreshToken()
                );

        refreshTokenService.revoke(refreshToken);

        return ResponseEntity.ok("Đăng xuất thành công");

    } catch (RuntimeException e) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(e.getMessage());
    }
}
@PostMapping("/change-password")
public ResponseEntity<?> changePassword(
        @Valid @RequestBody com.troroom.backend.dto.ChangePasswordRequest request,
        org.springframework.security.core.Authentication authentication) {

    if (authentication == null || !authentication.isAuthenticated()) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body("Chưa đăng nhập");
    }

    User user = (User) authentication.getPrincipal();

    try {
        authService.changePassword(
                user.getId(),
                request.getCurrentPassword(),
                request.getNewPassword()
        );

        return ResponseEntity.ok("Đổi mật khẩu thành công");

    } catch (RuntimeException e) {
        return ResponseEntity
                .badRequest()
                .body(e.getMessage());
    }
}
@GetMapping("/me")
public ResponseEntity<?> me(
        org.springframework.security.core.Authentication authentication) {

    if (authentication == null || !authentication.isAuthenticated()) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body("Chưa đăng nhập");
    }

    User user = (User) authentication.getPrincipal();

    return ResponseEntity.ok(
        java.util.Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "phone", user.getPhone(),
                "role", user.getRole().name(),
                "active", user.isActive(),
                "permissions",
                permissionService.getPermissions(user.getRole())
        )
    );
    }

}