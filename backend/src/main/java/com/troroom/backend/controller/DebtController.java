package com.troroom.backend.controller;

import com.troroom.backend.dto.DebtDtos.*;
import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.DebtService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

/**
 * Controller cho S4-03: Xem công nợ theo phòng và theo toà.
 */
@RestController
@RequestMapping("/api/debts")
public class DebtController {

    private final DebtService debtService;

    public DebtController(DebtService debtService) {
        this.debtService = debtService;
    }

    private User currentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        return user;
    }

    /**
     * 1. Lấy danh sách công nợ theo phòng và theo toà kèm bộ lọc và tổng cộng.
     */
    @GetMapping
    public ResponseEntity<DebtSummaryResponse> getDebts(
            Authentication auth,
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) Integer minOverdueDays,
            @RequestParam(required = false) Integer maxOverdueDays,
            @RequestParam(required = false) Long minDebtAmount,
            @RequestParam(required = false) Long maxDebtAmount,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate
    ) {
        DebtFilterRequest filter = new DebtFilterRequest(
                buildingId,
                minOverdueDays,
                maxOverdueDays,
                minDebtAmount,
                maxDebtAmount
        );
        return ResponseEntity.ok(debtService.getDebts(currentUser(auth), filter, referenceDate));
    }

    /**
     * 5. Xuất danh sách đang lọc ra tệp CSV mã hoá UTF-8 có chèn BOM '\ufeff' để Excel không bị lỗi font.
     */
    @GetMapping("/export-csv")
    public ResponseEntity<byte[]> exportCsv(
            Authentication auth,
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) Integer minOverdueDays,
            @RequestParam(required = false) Integer maxOverdueDays,
            @RequestParam(required = false) Long minDebtAmount,
            @RequestParam(required = false) Long maxDebtAmount,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate
    ) {
        DebtFilterRequest filter = new DebtFilterRequest(
                buildingId,
                minOverdueDays,
                maxOverdueDays,
                minDebtAmount,
                maxDebtAmount
        );

        byte[] csvBytes = debtService.exportCsv(currentUser(auth), filter, referenceDate);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("attachment", "DanhSachCongNo.csv");
        headers.setContentLength(csvBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(csvBytes);
    }

    /**
     * Ghi nhận thanh toán tiền phòng/hoá đơn.
     */
    @PostMapping("/invoices/{id}/pay")
    public ResponseEntity<?> recordPayment(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody RecordPaymentRequest request
    ) {
        Invoice invoice = debtService.recordPayment(currentUser(auth), id, request.amount());
        return ResponseEntity.ok(invoice);
    }

    /**
     * 4. Nạp bộ dữ liệu kiểm thử (ít nhất 5 trường hợp trả thiếu và 2 trường hợp quá hạn nhiều kỳ).
     */
    @PostMapping("/seed-test-data")
    public ResponseEntity<SeedTestDataResponse> seedTestData(Authentication auth) {
        return ResponseEntity.ok(debtService.seedTestData(currentUser(auth)));
    }
}
