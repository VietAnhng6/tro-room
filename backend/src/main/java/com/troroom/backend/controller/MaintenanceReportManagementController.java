
package com.troroom.backend.controller;

import com.troroom.backend.dto.MaintenanceReportManagementResponse;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.MaintenanceReportManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manager/maintenance-reports")
public class MaintenanceReportManagementController {

    private final MaintenanceReportManagementService service;

    public MaintenanceReportManagementController(
            MaintenanceReportManagementService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<MaintenanceReportManagementResponse>> list(
            Authentication authentication,
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String urgency) {

        return ResponseEntity.ok(
                service.list(
                        currentManager(authentication),
                        buildingId,
                        status,
                        urgency
                ).stream()
                        .map(service::toResponse)
                        .toList()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceReportManagementResponse> get(
            Authentication authentication,
            @PathVariable Long id) {

        return ResponseEntity.ok(
                service.toResponse(
                        service.get(currentManager(authentication), id)
                )
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MaintenanceReportManagementResponse> updateStatus(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam String note) {

        return ResponseEntity.ok(
                service.toResponse(
                        service.updateStatus(
                                currentManager(authentication), id, status, note)
                )
        );
    }

    @PatchMapping("/{id}/cost")
    public ResponseEntity<MaintenanceReportManagementResponse> updateCost(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam Long repairCost,
            @RequestParam String costPayer) {

        return ResponseEntity.ok(
                service.toResponse(
                        service.updateCost(
                                currentManager(authentication), id, repairCost, costPayer)
                )
        );
    }

    private User currentManager(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof User user)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Chưa đăng nhập.");
        }
        return user;
    }
}
