package com.troroom.backend.controller;

import com.troroom.backend.dto.InvoiceDtos.GenerateRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.InvoiceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * S3-06: API phát hành và tra cứu hoá đơn tháng.
 */
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    private User user(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User u)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        return u;
    }

    /** Phát hành hoá đơn cho cả toà trong một kỳ. */
    @PostMapping("/generate")
    public ResponseEntity<?> generate(Authentication auth, @RequestBody GenerateRequest body) {
        return ResponseEntity.ok(service.generate(user(auth), body));
    }

    /** Danh sách hoá đơn của một toà trong một kỳ. */
    @GetMapping
    public ResponseEntity<?> list(Authentication auth,
                                  @RequestParam Long buildingId,
                                  @RequestParam(required = false) String period) {
        return ResponseEntity.ok(service.list(user(auth), buildingId, period));
    }

    /** Chi tiết hoá đơn kèm các dòng khoản mục. */
    @GetMapping("/{id}")
    public ResponseEntity<?> detail(Authentication auth, @PathVariable Long id) {
        return ResponseEntity.ok(service.detail(user(auth), id));
    }
    
    /** Danh sách hóa đơn của khách thuê đang đăng nhập. */
    @GetMapping("/tenant")
    public ResponseEntity<?> tenantInvoices(Authentication auth) {
        return ResponseEntity.ok(service.listForTenant(user(auth)));
    }
}
