package com.troroom.backend.dto;

import java.time.LocalDateTime;

public record ListingSearchResponse(
        Long id,
        String title,
        String description,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,

        Long roomId,
        String roomCode,
        int floor,
        double area,
        long rent,
        int maxPeople,

        Long buildingId,
        String buildingName,
        String district,
        String address,
        String imageUrl
) {
}