
package com.troroom.backend.dto;

import com.troroom.backend.entity.MaintenanceReport;
import com.troroom.backend.entity.InvoiceItem;
import java.time.LocalDateTime;
import java.time.ZoneId;

public record MaintenanceReportManagementResponse(
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
        Long buildingId,
        String buildingName,
        Long repairCost,
        String costPayer,
        boolean tenantInvoicePending,
        String invoiceCode,
        String invoiceStatus,
        boolean urgentOverdue
) {
    public static MaintenanceReportManagementResponse from(
        MaintenanceReport report,
        String invoiceCode,
        String invoiceStatus) {

        LocalDateTime now = LocalDateTime.now(
                ZoneId.of("Asia/Ho_Chi_Minh"));

        boolean overdue =
                report.getUrgency() == MaintenanceReport.Urgency.URGENT
                && report.getStatus() == MaintenanceReport.Status.NEW
                && report.getCreatedAt() != null
                && report.getCreatedAt().isBefore(now.minusHours(24));

        var room = report.getRoom();
        var building = room != null ? room.getBuilding() : null;

        return new MaintenanceReportManagementResponse(
                report.getId(),
                report.getReportCode(),
                report.getDeviceType(),
                report.getDescription(),
                report.getUrgency() != null
                        ? report.getUrgency().name() : null,
                report.getStatus() != null
                        ? report.getStatus().name() : null,
                report.getManagerResponse(),
                report.getCreatedAt(),
                room != null ? room.getId() : null,
                room != null ? room.getCode() : null,
                building != null ? building.getId() : null,
                building != null ? building.getName() : null,
                report.getRepairCost(),
                report.getCostPayer() != null
                        ? report.getCostPayer().name() : null,
                report.isTenantInvoicePending(),
                invoiceCode,
                invoiceStatus,
                overdue
        );
    }
}
