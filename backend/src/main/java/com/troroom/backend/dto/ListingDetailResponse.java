package com.troroom.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ListingDetailResponse(
        Long id,
        String title,
        String description,
        String status,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        Long roomId,
        String roomCode,
        int floor,
        double area,
        long rent,
        int maxPeople,
        long estimatedDeposit,
        String buildingName,
        String district,
        String address,
        List<ImageItem> images,
        List<ServiceItem> services,
        long estimatedFixedMonthlyCost,
        long estimatedFirstMonthCost
) {
    public record ImageItem(Long id, String imageUrl, int sortOrder) {}
    public record ServiceItem(Long id, String name, String calculationMethod, String unit, long price) {}
}
