package com.troroom.backend.dto;

import java.time.LocalDate;
import java.util.List;

/** S3-06: các DTO của màn hình phát hành hoá đơn tháng. */
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
            LocalDate issueDate,
            LocalDate dueDate,
            List<ItemResponse> items
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