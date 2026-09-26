package com.troroom.backend.controller;

import com.troroom.backend.entity.Activitylog;
import com.troroom.backend.service.ActivityLogService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

// Lưu ý: đây chỉ có GET - không có PUT/DELETE cho nhật ký, đúng yêu cầu "chỉ đọc"
// của S1-10. Nằm dưới /api/admin nên đã được PermissionAuthorizationManager
// bảo vệ bằng quyền ADMIN_ACCESS.
@RestController
@RequestMapping("/api/admin/logs")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    public ActivityLogController(ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @GetMapping
    public ResponseEntity<?> getLogs(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String entityType,
            @RequestParam(defaultValue = "0") int page
    ) {
        try {
            LocalDateTime from = fromDate == null ? null : LocalDate.parse(fromDate).atStartOfDay();
            LocalDateTime to = toDate == null ? null : LocalDate.parse(toDate).atTime(23, 59, 59);

            Pageable pageable = PageRequest.of(page, 20);

            Page<Activitylog> logs = activityLogService.search(from, to, actorId, entityType, pageable);

            return ResponseEntity.ok(logs);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Khoảng ngày không hợp lệ"));
        }
    }
}