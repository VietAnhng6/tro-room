package com.troroom.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record RentalContractDetailResponse(
        Long id,
        String contractCode,
        String roomCode,
        double roomArea,
        int maxPeople,
        String buildingName,
        String buildingAddress,
        String tenantName,
        long rent,
        long deposit,
        LocalDate startDate,
        LocalDate endDate,
        int termMonths,
        int billingCutoffDay,
        Integer initialElectricity,
        Integer initialWater,
        long daysRemaining,
        boolean expiringSoon,
        String status,
        LocalDateTime createdAt,
        List<RentalContractPersonResponse> people,
        List<RentalContractServiceItemResponse> services
) {}
