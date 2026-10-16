package com.troroom.backend.dto;

import com.troroom.backend.entity.MaintenanceReport;
import java.time.LocalDateTime;
import java.util.List;

public record MaintenanceReportResponse(
        Long id,
        String reportCode,
        String deviceType,
        String description,
        String urgency,
        String status,
        String managerResponse,
        LocalDateTime createdAt,
        Long roomId,
        String roomCode,
        List<Long> photoIds
) {
    public static MaintenanceReportResponse from(MaintenanceReport report) {
        return new MaintenanceReportResponse(
                report.getId(), report.getReportCode(), report.getDeviceType(),
                report.getDescription(), report.getUrgency().name(), report.getStatus().name(),
                report.getManagerResponse(), report.getCreatedAt(), report.getRoom().getId(),
                report.getRoom().getCode(), report.getPhotos().stream().map(p -> p.getId()).toList()
        );
    }
}
