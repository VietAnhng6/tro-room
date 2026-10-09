package com.troroom.backend.dto;

import java.time.LocalDate;

public record RentalContractPersonResponse(
        String role,
        String fullName,
        String phone,
        String citizenId,
        LocalDate startDate,
        LocalDate endDate
) {}
