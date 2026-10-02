package com.troroom.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record RentalRequestResponse(
        String requestCode,
        String type,
        LocalDate desiredDate,
        int expectedPeople,
        String message,
        String status,
        LocalDateTime createdAt
) {}
