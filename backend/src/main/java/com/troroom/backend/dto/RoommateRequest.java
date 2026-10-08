package com.troroom.backend.dto;

import java.time.LocalDate;

public record RoommateRequest(
        String fullName,
        String phone,
        String citizenId,
        LocalDate startDate,
        String note
) {}
