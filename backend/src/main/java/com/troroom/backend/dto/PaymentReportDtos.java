package com.troroom.backend.dto;

import com.troroom.backend.entity.PaymentReport;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

public final class PaymentReportDtos {

    private PaymentReportDtos() {
    }

    public record CreateRequest(
            @NotNull(message = "Vui lòng nhập số tiền đã thanh toán")
            @Positive(message = "Số tiền thanh toán phải lớn hơn 0")
            Long amount,

            @NotNull(message = "Vui lòng chọn ngày thanh toán")
            LocalDate paymentDate,

            @NotNull(message = "Vui lòng chọn phương thức thanh toán")
            PaymentReport.PaymentMethod paymentMethod
    ) {
    }

    public record Response(
            Long id,
            Long invoiceId,
            String invoiceCode,
            long amount,
            LocalDate paymentDate,
            PaymentReport.PaymentMethod paymentMethod,
            PaymentReport.Status status,
            boolean hasProofImage,
            java.time.LocalDateTime createdAt
    ) {
    }
}