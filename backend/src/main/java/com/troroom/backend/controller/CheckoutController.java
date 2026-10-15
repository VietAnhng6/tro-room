package com.troroom.backend.controller;

import com.troroom.backend.dto.CheckoutDtos.CheckoutRequest;
import com.troroom.backend.dto.CheckoutDtos.SettlementResponse;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.CheckoutService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * S4-04: Trả phòng và tất toán tiền cọc.
 */
@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    /**
     * Xem trước bảng tất toán trước khi xác nhận.
     */
    @PostMapping("/{contractId}/preview")
    public ResponseEntity<SettlementResponse> preview(
            Authentication authentication,
            @PathVariable Long contractId,
            @RequestBody CheckoutRequest request
    ) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(
                checkoutService.preview(user, contractId, request)
        );
    }

    /**
     * Thực hiện trả phòng và tất toán.
     */
    @PostMapping("/{contractId}")
    public ResponseEntity<SettlementResponse> settle(
            Authentication authentication,
            @PathVariable Long contractId,
            @RequestBody CheckoutRequest request
    ) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(
                checkoutService.settle(user, contractId, request)
        );
    }

    /**
     * Xem bảng tất toán đã lưu.
     */
    @GetMapping("/{contractId}")
    public ResponseEntity<SettlementResponse> get(
            Authentication authentication,
            @PathVariable Long contractId
    ) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(
                checkoutService.getSettlementResponse(user, contractId)
        );
    }

    /**
     * Tải bảng tất toán dạng PDF.
     */
    @GetMapping("/{contractId}/pdf")
    public ResponseEntity<byte[]> getPdf(
            Authentication authentication,
            @PathVariable Long contractId
    ) {
        User user = currentUser(authentication);
        byte[] pdf = checkoutService.getPdf(user, contractId);

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"tat-toan-"
                                + contractId + ".pdf\""
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof User user)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập"
            );
        }
        return user;
    }
}
