package com.troroom.backend.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * DTOs cho tác vụ S4-03: Xem công nợ theo phòng và theo toà.
 */
public final class DebtDtos {

    private DebtDtos() {
    }

    public record DebtInvoiceItem(
            Long id,
            String invoiceCode,
            String period,
            LocalDate issueDate,
            LocalDate dueDate,
            long totalAmount,
            long paidAmount,
            long remainingAmount,
            long daysOverdue,
            String status
    ) {
    }

    public record RoomDebtItem(
            Long buildingId,
            String buildingName,
            Long roomId,
            String roomCode,
            Long contractId,
            String contractCode,
            String tenantName,
            String tenantPhone,
            int unpaidInvoiceCount,
            long totalRemainingDebt,
            LocalDate oldestDueDate,
            long maxDaysOverdue,
            List<DebtInvoiceItem> unpaidInvoices
    ) {
    }

    public record DebtFilterRequest(
            Long buildingId,
            Integer minOverdueDays,
            Integer maxOverdueDays,
            Long minDebtAmount,
            Long maxDebtAmount
    ) {
    }

    public record DebtSummaryResponse(
            List<RoomDebtItem> items,
            int totalRoomsWithDebt,
            long totalRemainingDebt,
            int totalUnpaidInvoices
    ) {
    }

    public record RecordPaymentRequest(
            long amount,
            String note
    ) {
    }

    public record SeedTestDataResponse(
            String message,
            Long buildingId,
            String buildingName,
            int roomsCreated,
            int invoicesCreated
    ) {
    }
}
