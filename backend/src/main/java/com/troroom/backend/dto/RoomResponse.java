package com.troroom.backend.dto;

import com.troroom.backend.entity.Room;

public record RoomResponse(
        Long id,
        String code,
        int floor,
        double area,
        long rent,
        int maxPeople,
        Room.Status status,
        Long buildingId,
        String buildingName
) {}