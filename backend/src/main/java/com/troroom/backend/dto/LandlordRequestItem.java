package com.troroom.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Một dòng trong danh sách yêu cầu của Chủ nhà (S2-07). */
public record LandlordRequestItem(
        Long id, String requestCode,
        String tenantName, String tenantPhone,
        Long roomId, String roomCode,
        Long buildingId, String buildingName,
        String type, LocalDate desiredDate, int expectedPeople, String message,
        String status, LocalDateTime scheduledAt, LocalDateTime createdAt,
        boolean overdue
) {}