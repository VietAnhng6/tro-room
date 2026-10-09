package com.troroom.backend.dto;

import com.troroom.backend.entity.Roommate;
import java.time.LocalDate;

public record RoommateResponse(
        Long id,
        Long roomId,
        String fullName,
        String phone,
        String citizenId,
        LocalDate startDate,
        LocalDate endDate,
        Roommate.Status status,
        String note
) {}
