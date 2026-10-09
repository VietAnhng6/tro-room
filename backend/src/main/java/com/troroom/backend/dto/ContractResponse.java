package com.troroom.backend.dto;

import com.troroom.backend.entity.Contract;
import java.time.LocalDate;

public record ContractResponse(
        Long id,
        String contractCode,
        Long roomId,
        String roomCode,
        String tenantName,
        String tenantPhone,
        String tenantCitizenId,
        LocalDate startDate,
        LocalDate endDate,
        long depositAmount,
        long rentAmount,
        Contract.Status status,
        String note
) {}
