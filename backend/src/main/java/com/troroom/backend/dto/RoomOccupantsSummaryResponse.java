package com.troroom.backend.dto;

import java.util.List;

public record RoomOccupantsSummaryResponse(
        Long roomId,
        String roomCode,
        Long buildingId,
        String buildingName,
        int maxPeople,
        int currentOccupants,
        int availableSlots,
        boolean isFull,
        ContractResponse mainContract,
        List<RoommateResponse> activeRoommates,
        List<RoommateResponse> movedOutRoommates
) {}
