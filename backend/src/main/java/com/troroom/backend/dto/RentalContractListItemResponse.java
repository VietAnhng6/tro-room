package com.troroom.backend.dto;

import java.time.LocalDate;

public record RentalContractListItemResponse(
        Long id,
        String contractCode,
        String roomCode,
        String buildingName,
        long rent,
        long deposit,
        LocalDate startDate,
        LocalDate endDate,
        long daysRemaining,
        boolean expiringSoon,
        String status
) {}
