package com.troroom.backend.controller;

import com.troroom.backend.entity.User;
import com.troroom.backend.service.RequestActionException;
import com.troroom.backend.service.RequestHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/** S2-08: Khách thuê xem lịch sử xử lý yêu cầu của chính mình. */
@RestController
@RequestMapping("/api/tenant/requests")
public class TenantRequestHistoryController {
    private final RequestHistoryService historyService;

    public TenantRequestHistoryController(RequestHistoryService historyService) {
        this.historyService = historyService;
    }

    private User tenant(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User u)) return null;
        return u.getRole() == User.Role.TENANT ? u : null;
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<?> history(Authentication auth, @PathVariable Long id) {
        User u = tenant(auth);
        if (u == null) return ResponseEntity.status(403).body(Map.of("message", "Chỉ Khách thuê được xem lịch sử yêu cầu của mình"));
        try {
            return ResponseEntity.ok(historyService.historyForTenant(u, id));
        } catch (RequestActionException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage(), "code", e.getCode()));
        }
    }
}