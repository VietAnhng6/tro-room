package com.troroom.backend.controller;

import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.LandlordRequestService;
import com.troroom.backend.service.RequestActionException;
import com.troroom.backend.service.RequestHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * S2-07: Chủ nhà xem danh sách yêu cầu thuê / xem phòng.
 * S2-08: xác nhận lịch, đổi lịch, duyệt, từ chối và xem lịch sử.
 */
@RestController
@RequestMapping("/api/landlord/requests")
public class LandlordRequestController {
    private final LandlordRequestService service;
    private final RequestHistoryService historyService;

    public LandlordRequestController(LandlordRequestService service, RequestHistoryService historyService) {
        this.service = service;
        this.historyService = historyService;
    }

    /** Nội dung gửi lên khi xác nhận hoặc đổi lịch. force = true nghĩa là vẫn xác nhận dù có cảnh báo trùng lịch. */
    public record ScheduleBody(LocalDateTime scheduledAt, Boolean force) {}

    /** Nội dung gửi lên khi từ chối. reason là một trong ALREADY_RENTED, PEOPLE_MISMATCH, UNREACHABLE, OTHER. */
    public record RejectBody(String reason, String note) {}

    private User landlord(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User u)) return null;
        return u.getRole() == User.Role.LANDLORD ? u : null;
    }

    @GetMapping
    public ResponseEntity<?> list(Authentication auth,
                                  @RequestParam(required = false) String status,
                                  @RequestParam(required = false) Long buildingId,
                                  @RequestParam(defaultValue = "newest") String sort) {
        User u = landlord(auth);
        if (u == null) return ResponseEntity.status(403).body(Map.of("message", "Chỉ Chủ nhà được xem danh sách yêu cầu"));
        RentalRequest.Status st = null;
        if (status != null && !status.isBlank()) {
            try {
                st = RentalRequest.Status.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Trạng thái không hợp lệ"));
            }
        }
        return ResponseEntity.ok(service.list(u, st, buildingId, "oldest".equalsIgnoreCase(sort)));
    }

    /** Số yêu cầu chưa xử lý, dùng cho số đếm trên menu. */
    @GetMapping("/pending-count")
    public ResponseEntity<?> pendingCount(Authentication auth) {
        User u = landlord(auth);
        if (u == null) return ResponseEntity.status(403).body(Map.of("message", "Chỉ Chủ nhà được xem danh sách yêu cầu"));
        return ResponseEntity.ok(Map.of("count", service.pendingCount(u)));
    }

    /** S2-08: xác nhận lịch xem phòng, hoặc đổi lịch nếu yêu cầu đã ở trạng thái Đã hẹn lịch. */
    @PostMapping("/{id}/schedule")
    public ResponseEntity<?> schedule(Authentication auth, @PathVariable Long id, @RequestBody ScheduleBody body) {
        User u = landlord(auth);
        if (u == null) return forbidden();
        try {
            return ResponseEntity.ok(service.schedule(u, id, body.scheduledAt(), Boolean.TRUE.equals(body.force())));
        } catch (RequestActionException e) {
            return error(e);
        }
    }

    /** S2-08: duyệt yêu cầu Thuê ngay, phòng chuyển sang Đã đặt cọc. */
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(Authentication auth, @PathVariable Long id) {
        User u = landlord(auth);
        if (u == null) return forbidden();
        try {
            return ResponseEntity.ok(service.approve(u, id));
        } catch (RequestActionException e) {
            return error(e);
        }
    }

    /** S2-08: từ chối, bắt buộc có lý do. */
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(Authentication auth, @PathVariable Long id, @RequestBody RejectBody body) {
        User u = landlord(auth);
        if (u == null) return forbidden();
        try {
            return ResponseEntity.ok(service.reject(u, id, body.reason(), body.note()));
        } catch (RequestActionException e) {
            return error(e);
        }
    }

    /** S2-08: lịch sử đổi trạng thái của một yêu cầu. */
    @GetMapping("/{id}/history")
    public ResponseEntity<?> history(Authentication auth, @PathVariable Long id) {
        User u = landlord(auth);
        if (u == null) return forbidden();
        try {
            return ResponseEntity.ok(historyService.historyForLandlord(u, id));
        } catch (RequestActionException e) {
            return error(e);
        }
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "Chỉ Chủ nhà được xử lý yêu cầu"));
    }

    private ResponseEntity<?> error(RequestActionException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage(), "code", e.getCode()));
    }
}