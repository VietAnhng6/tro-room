
package com.troroom.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** DTO của màn hình phát hành và theo dõi hóa đơn. */
public final class InvoiceDtos {

    private InvoiceDtos() {
    }

    public record GenerateRequest(
            Long buildingId,
            String period,
            LocalDate issueDate,
            LocalDate dueDate
    ) {
    }

    public record SkippedRoom(
            Long contractId,
            Long roomId,
            String roomCode,
            String reason
    ) {
    }

    public record GenerateResponse(
            Long buildingId,
            String period,
            int totalRooms,
            int created,
            List<SkippedRoom> skippedRooms
    ) {
    }

    public record ItemResponse(
            Long id,
            String label,
            String type,
            int quantity,
            String unit,
            long unitPrice,
            long amount,
            Integer previousReading,
            Integer currentReading,
            String note
    ) {
    }

    public record InvoiceResponse(
            Long id,
            String invoiceCode,
            Long contractId,
            String contractCode,
            Long roomId,
            String roomCode,
            String tenantName,
            String period,
            long rentAmount,
            long totalAmount,
            String status,
            String cancellationReason,
            LocalDate issueDate,
            LocalDate dueDate,
            List<ItemResponse> items,
            long paidAmount,
            long outstandingAmount,
            List<PaymentResponse> payments
    ) {
    }

    /** Một lần thanh toán và thông tin kiểm toán liên quan. */
    public record PaymentResponse(
            Long id,
            long amount,
            LocalDate receivedDate,
            String paymentMethod,
            String status,
            String confirmedByName,
            String cancelReason,
            LocalDateTime createdAt,
            LocalDateTime cancelledAt
    ) {
    }

    public record EditInvoiceRequest(
            List<EditItemRequest> items,
            String reason
    ) {
    }

    public record EditItemRequest(
            Long id,
            String label,
            String type,
            int quantity,
            String unit,
            long unitPrice,
            Integer previousReading,
            Integer currentReading,
            String note
    ) {
    }
}
