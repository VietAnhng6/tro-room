package com.troroom.backend.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        LocalDateTime timestamp,
        Long actorId,
        String actorRole,
        String action,
        String objectType,
        Long objectId,
        String beforeData,
        String afterData
) {}