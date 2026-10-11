
package com.troroom.backend.controller;

import com.troroom.backend.dto.InvoiceDtos.EditInvoiceRequest;
import com.troroom.backend.dto.InvoiceDtos.GenerateRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.InvoiceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    private User user(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User u)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        return u;
    }

    /** Tạo hóa đơn nháp hàng loạt cho một tòa nhà và kỳ. */
    @PostMapping("/generate")
    public ResponseEntity<?> generate(
            Authentication auth,
            @RequestBody GenerateRequest body) {
        return ResponseEntity.ok(service.generate(user(auth), body));
    }

    /** Danh sách hóa đơn của một tòa nhà trong một kỳ. */
    @GetMapping
    public ResponseEntity<?> list(
            Authentication auth,
            @RequestParam Long buildingId,
            @RequestParam(required = false) String period) {
        return ResponseEntity.ok(service.list(user(auth), buildingId, period));
    }

    /** Chi tiết hóa đơn. */
    @GetMapping("/{id}")
    public ResponseEntity<?> detail(
            Authentication auth,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.detail(user(auth), id));
    }

    /** Danh sách hóa đơn đã phát hành của khách thuê đang đăng nhập. */
    @GetMapping("/tenant")
    public ResponseEntity<?> tenantInvoices(Authentication auth) {
        return ResponseEntity.ok(service.listForTenant(user(auth)));
    }

    /** Chỉnh sửa hóa đơn khi còn ở trạng thái DRAFT. */
    @PutMapping("/{id}")
    public ResponseEntity<?> edit(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody EditInvoiceRequest body) {
        return ResponseEntity.ok(service.edit(user(auth), id, body));
    }

    /** Phát hành một hóa đơn nháp. */
    @PostMapping("/{id}/issue")
    public ResponseEntity<?> issue(
            Authentication auth,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.issue(user(auth), id));
    }

    /** Hủy hóa đơn đã phát hành; bắt buộc có lý do. */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody CancelRequest body) {
        if (body == null || body.reason() == null || body.reason().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do hủy hóa đơn");
        }
        return ResponseEntity.ok(
                service.cancel(user(auth), id, body.reason()));
    }

    public record CancelRequest(String reason) {
    }
}
