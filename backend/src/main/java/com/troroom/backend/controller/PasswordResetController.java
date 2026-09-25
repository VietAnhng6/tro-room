package com.troroom.backend.controller;

import com.troroom.backend.dto.ResetPasswordRequest;
import com.troroom.backend.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(
            PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @RequestParam String email) {

        try {
            passwordResetService.requestReset(email);

            return ResponseEntity.ok(
                    "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @GetMapping("/reset-password/validate")
    public ResponseEntity<?> validateResetToken(
            @RequestParam String token) {

        try {
            passwordResetService.validateToken(token);

            return ResponseEntity.ok(
                    "Token hợp lệ"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        try {
            passwordResetService.resetPassword(
                    request.getToken(),
                    request.getNewPassword()
            );

            return ResponseEntity.ok(
                    "Đặt lại mật khẩu thành công"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
}