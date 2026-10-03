package com.troroom.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record RentalRequestResponse(
        Long id,
        String code,
        Long listingId,
        String listingTitle,
        Long roomId,
        String roomCode,
        String buildingName,
        String type,
        LocalDate desiredDate,
        int peopleCount,
        String message,
        String status,
        LocalDateTime appointmentAt,
        String rejectReason,
        LocalDateTime createdAt
) {}
