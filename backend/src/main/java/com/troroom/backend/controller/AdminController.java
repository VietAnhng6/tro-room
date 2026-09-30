package com.troroom.backend.controller;

import com.troroom.backend.dto.AdminCreateUserRequest;
import com.troroom.backend.dto.AdminUserResponse;
import com.troroom.backend.service.AdminService;
import com.troroom.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import jakarta.validation.Valid;
import com.troroom.backend.dto.ChangePasswordRequest;
import com.troroom.backend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Sort;
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final AuthService authService;

    public AdminController(
        AdminService adminService,
        AuthService authService) {

    this.adminService = adminService;
    this.authService = authService;
    }

    @PostMapping("/users")
    public ResponseEntity<?> createStaffAccount(
            @Valid @RequestBody AdminCreateUserRequest request) {

        try {

            String temporaryPassword =
                    adminService.createStaffAccount(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                        "Tạo tài khoản thành công. "
                        + "Mật khẩu tạm: "
                        + temporaryPassword
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
    @PostMapping("/change-password")
public ResponseEntity<?> changePassword(
        @RequestParam Long userId,
        @Valid @RequestBody ChangePasswordRequest request) {

    try {
        authService.changePassword(
                userId,
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
    @PutMapping("/users/{userId}/lock")
public ResponseEntity<?> lockUser(@PathVariable Long userId) {

    try {
        adminService.lockUser(userId);

        return ResponseEntity.ok(
                "Khóa tài khoản thành công"
        );

    } catch (RuntimeException e) {

        return ResponseEntity
                .badRequest()
                .body(e.getMessage());
    }
}

@PutMapping("/users/{userId}/unlock")
public ResponseEntity<?> unlockUser(@PathVariable Long userId) {

    try {
        adminService.unlockUser(userId);

        return ResponseEntity.ok(
                "Mở khóa tài khoản thành công"
        );

    } catch (RuntimeException e) {

        return ResponseEntity
                .badRequest()
                .body(e.getMessage());
    }
    }
    @GetMapping("/users")
public ResponseEntity<?> getUsers(
        @RequestParam(required = false) User.Role role,
        @RequestParam(required = false) Boolean active,
        @RequestParam(defaultValue = "0") int page) {

    try {
        // Mỗi trang tối đa 20 tài khoản
        Pageable pageable = PageRequest.of(
        page,
        20,
        Sort.by(Sort.Direction.ASC, "id")
        );
      Page<AdminUserResponse> users =
        adminService.getUsers(
                role,
                active,
                pageable
        );
        return ResponseEntity.ok(users);

    } catch (Exception e) {

        return ResponseEntity
                .badRequest()
                .body(e.getMessage());
    }
    }   
}