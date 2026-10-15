package com.troroom.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** DTO của màn hình trả phòng và tất toán tiền cọc (S4-04). */
public final class CheckoutDtos {

    private CheckoutDtos() {
    }

    public record DeductionRequest(
            String name,
            long amount
    ) {
    }

    public record CheckoutRequest(
            LocalDate actualCheckoutDate,
            Integer finalElectricity,
            Integer finalWater,
            List<DeductionRequest> deductions,
            Boolean earlyTermination,
            String terminationReason,
            Long depositPenaltyAmount
    ) {
    }

    public record DeductionResponse(
            String name,
            String type,
            long amount
    ) {
    }

    public record FinalInvoiceLineResponse(
            String label,
            String type,
            int quantity,
            String unit,
            long unitPrice,
            long amount,
            Integer previousReading,
            Integer currentReading
    ) {
    }

    public record SettlementResponse(
            Long contractId,
            String contractCode,
            Long roomId,
            String roomCode,
            String buildingName,
            String tenantName,
            String tenantPhone,
            LocalDate checkoutDate,
            int lastElectricity,
            int lastWater,
            int finalElectricity,
            int finalWater,
            long depositAmount,
            List<DeductionResponse> deductions,
            long totalDeductions,
            long previousDebt,
            String finalInvoiceCode,
            List<FinalInvoiceLineResponse> finalInvoiceLines,
            long finalInvoiceAmount,
            long refundAmount,
            long payableAmount,
            boolean earlyTerminated,
            String terminationReason,
            LocalDateTime createdAt
    ) {
    }
}
