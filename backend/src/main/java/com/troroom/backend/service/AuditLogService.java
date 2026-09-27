package com.troroom.backend.service;

import com.troroom.backend.entity.AuditLog;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditLogService(
            AuditLogRepository auditLogRepository,
            ObjectMapper objectMapper
    ) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    public void log(
            User actor,
            String action,
            String objectType,
            Long objectId,
            Object beforeData,
            Object afterData
    ) {
        AuditLog log = new AuditLog();

        log.setTimestamp(LocalDateTime.now());
        log.setActor(actor);
        log.setActorRole(actor.getRole().name());
        log.setAction(action);
        log.setObjectType(objectType);
        log.setObjectId(objectId);
        log.setBeforeData(toJson(beforeData));
        log.setAfterData(toJson(afterData));

        auditLogRepository.save(log);
    }

    private String toJson(Object data) {
        if (data == null) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            return String.valueOf(data);
        }
    }
}