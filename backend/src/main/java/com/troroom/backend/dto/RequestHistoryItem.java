package com.troroom.backend.dto;

import java.time.LocalDateTime;

/** Một dòng lịch sử đổi trạng thái của yêu cầu thuê (S2-08). */
public record RequestHistoryItem(
        String fromStatus,
        String toStatus,
        String actorName,
        String note,
        LocalDateTime createdAt) {
}