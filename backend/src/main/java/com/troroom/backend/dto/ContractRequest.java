package com.troroom.backend.dto;

import java.time.LocalDate;

public record ContractRequest(
        String tenantName,
        String tenantPhone,
        String tenantCitizenId,
        LocalDate startDate,
        LocalDate endDate,
        Long depositAmount,
        Long rentAmount,
        String note
) {}
