package com.troroom.backend.controller;

import com.troroom.backend.dto.MeterReadingDtos.SaveRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.MeterReadingException;
import com.troroom.backend.service.MeterReadingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * S3-05: API nhập chỉ số điện nước cuối kỳ cho Quản lý toà nhà (và Chủ nhà).
 */
@RestController
@RequestMapping("/api/manager/meter-readings")
public class MeterReadingController {

    private final MeterReadingService service;

    public MeterReadingController(MeterReadingService service) {
        this.service = service;
    }

    private User user(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User u)) {
            throw new MeterReadingException(401, "UNAUTHORIZED", "Chưa đăng nhập");
        }
        return u;
    }

    /** Các toà nhà mà người dùng được phép ghi chỉ số. */
    @GetMapping("/buildings")
    public ResponseEntity<?> buildings(Authentication auth) {
        try {
            return ResponseEntity.ok(service.buildings(user(auth)));
        } catch (MeterReadingException e) {
            return error(e);
        }
    }

    /** Danh sách phòng đang thuê của toà theo kỳ (mặc định tháng hiện tại). */
    @GetMapping
    public ResponseEntity<?> list(Authentication auth,
                                  @RequestParam Long buildingId,
                                  @RequestParam(required = false) String period) {
        try {
            return ResponseEntity.ok(service.list(user(auth), buildingId, period));
        } catch (MeterReadingException e) {
            return error(e);
        }
    }

    /** Lưu chỉ số của một phòng. */
    @PostMapping
    public ResponseEntity<?> save(Authentication auth, @RequestBody SaveRequest body) {
        try {
            return ResponseEntity.ok(service.save(user(auth), body));
        } catch (MeterReadingException e) {
            return error(e);
        }
    }

    private ResponseEntity<?> error(MeterReadingException e) {
        Map<String, Object> body = new HashMap<>(e.getExtra());
        body.put("message", e.getMessage());
        body.put("code", e.getCode());
        return ResponseEntity.status(e.getStatus()).body(body);
    }
}
