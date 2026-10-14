package com.troroom.backend.controller;

import com.troroom.backend.dto.PaymentReportDtos;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.PaymentReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/payment-reports")
public class PaymentReportController {

    private final PaymentReportService service;

    public PaymentReportController(PaymentReportService service) {
        this.service = service;
    }

    private User user(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User u)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chưa đăng nhập");
        }
        return u;
    }

    /** Khách thuê tạo báo cáo thanh toán cho hóa đơn của mình. */
    @PostMapping("/invoices/{invoiceId}")
    public ResponseEntity<PaymentReportDtos.Response> create(
            Authentication auth,
            @PathVariable Long invoiceId,
            @Valid @RequestBody PaymentReportDtos.CreateRequest body) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(user(auth), invoiceId, body));
    }

    /** Khách thuê xem các báo cáo thanh toán của mình. */
    @GetMapping("/mine")
    public ResponseEntity<List<PaymentReportDtos.Response>> listMine(
            Authentication auth) {
        return ResponseEntity.ok(service.listMine(user(auth)));
    }

    /** Khách thuê xem chi tiết báo cáo của mình. */
    @GetMapping("/{id}")
    public ResponseEntity<PaymentReportDtos.Response> detailMine(
            Authentication auth,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.detailMine(user(auth), id));
    }

    /** Khách thuê hủy báo cáo khi còn chờ xác nhận. */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<PaymentReportDtos.Response> cancelMine(
            Authentication auth,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.cancelMine(user(auth), id));
    }
    @PostMapping(
        value = "/{id}/proof",
        consumes = "multipart/form-data"
    )
    public ResponseEntity<PaymentReportDtos.Response> uploadProof(
            Authentication auth,
            @PathVariable Long id,
            @RequestParam("image") MultipartFile image
    ) throws IOException {
        return ResponseEntity.ok(
                service.uploadProof(user(auth), id, image)
        );
    }
    
    /**
     * ADMIN hoặc chủ nhà đúng tòa nhà tạo link xem ảnh, hạn 15 phút.
     */
    @PostMapping("/{id}/proof-link")
    public ResponseEntity<String> createProofLink(
            Authentication auth,
            @PathVariable Long id) {

    String token = service.createProofLink(user(auth), id);

    return ResponseEntity.ok(token);
    }

    /**
     * Mở ảnh chứng từ bằng token tạm thời.
     */
    @GetMapping("/proof/{token}")
    public ResponseEntity<Resource> viewProof(
        @PathVariable String token) {

    Path path = service.getProofPathByToken(token);
    String filename = path.getFileName().toString().toLowerCase();

    MediaType mediaType;
    if (filename.endsWith(".png")) {
        mediaType = MediaType.IMAGE_PNG;
    } else if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
        mediaType = MediaType.IMAGE_JPEG;
    } else {
        throw new ResponseStatusException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Định dạng ảnh chứng từ không được hỗ trợ");
    }

    Resource resource = new FileSystemResource(path);

    return ResponseEntity.ok()
            .contentType(mediaType)
            .header(
                    HttpHeaders.CACHE_CONTROL,
                    "no-store, no-cache, must-revalidate")
            .body(resource);
    }
    
    /** Chủ nhà xem danh sách báo cáo thanh toán của mình. */
    @GetMapping("/landlord")
    public ResponseEntity<List<PaymentReportDtos.Response>> listForLandlord(
            Authentication auth) {
        return ResponseEntity.ok(
                service.listForLandlord(user(auth))
        );
    }

    /** Chủ nhà xác nhận báo cáo thanh toán. */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<PaymentReportDtos.Response> confirm(
            Authentication auth,
            @PathVariable Long id) {
        return ResponseEntity.ok(
                service.confirm(user(auth), id)
        );
    }

    /** Chủ nhà từ chối báo cáo thanh toán. */
    @PostMapping("/{id}/reject")
    public ResponseEntity<PaymentReportDtos.Response> reject(
            Authentication auth,
            @PathVariable Long id) {
        return ResponseEntity.ok(
                service.reject(user(auth), id)
        );
    }

}