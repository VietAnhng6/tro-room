package com.troroom.backend.controller;

import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.LandlordRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/** S2-07: Chủ nhà xem danh sách yêu cầu thuê / xem phòng. */
@RestController
@RequestMapping("/api/landlord/requests")
public class LandlordRequestController {
    private final LandlordRequestService service;

    public LandlordRequestController(LandlordRequestService service) {
        this.service = service;
    }

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
}