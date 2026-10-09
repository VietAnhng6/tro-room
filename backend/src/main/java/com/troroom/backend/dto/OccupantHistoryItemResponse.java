package com.troroom.backend.dto;

import java.time.LocalDate;

public record OccupantHistoryItemResponse(
        Long id,
        String roleType, // "MAIN_TENANT" (Người đứng tên hợp đồng) | "ROOMMATE" (Người ở ghép)
        String roleLabel, // "Người đứng tên hợp đồng" | "Người ở ghép"
        String fullName,
        String phone,
        String citizenId,
        LocalDate startDate,
        LocalDate endDate,
        String status, // "ACTIVE" (Đang ở), "MOVED_OUT" (Đã chuyển đi), "TERMINATED", "EXPIRED"
        String statusLabel, // "Đang ở", "Đã chuyển đi", "Hết hạn", "Đã chấm dứt"
        String note,
        Long stayDays
) {}
