package com.troroom.backend.dto;

import com.troroom.backend.entity.ContractRenewal;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ContractRenewalResponse(
        Long id,
        Long contractId,
        LocalDate startDate,
        LocalDate endDate,
        int termMonths,
        long rent,
        String renewedByName,
        LocalDateTime createdAt
) {
    public static ContractRenewalResponse from(
            ContractRenewal renewal
    ) {
        return new ContractRenewalResponse(
                renewal.getId(),
                renewal.getContract().getId(),
                renewal.getStartDate(),
                renewal.getEndDate(),
                renewal.getTermMonths(),
                renewal.getRent(),
                renewal.getRenewedBy().getName(),
                renewal.getCreatedAt()
        );
    }
}