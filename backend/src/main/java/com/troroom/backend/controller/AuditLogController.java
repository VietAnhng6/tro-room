package com.troroom.backend.controller;

import com.troroom.backend.dto.AuditLogResponse;
import com.troroom.backend.repository.AuditLogRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    public AuditLogController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogResponse>> getAllLogs(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String objectType
    ) {
        LocalDateTime fromDate = from == null || from.isBlank()
                ? null
                : LocalDateTime.parse(from);

        LocalDateTime toDate = to == null || to.isBlank()
                ? null
                : LocalDateTime.parse(to);

        List<AuditLogResponse> logs =
                auditLogRepository.search(
                        fromDate,
                        toDate,
                        actorId,
                        objectType
                )
                .stream()
                .map(log -> new AuditLogResponse(
                        log.getId(),
                        log.getTimestamp(),
                        log.getActor() != null
                                ? log.getActor().getId()
                                : null,
                        log.getActorRole(),
                        log.getAction(),
                        log.getObjectType(),
                        log.getObjectId(),
                        log.getBeforeData(),
                        log.getAfterData()
                ))
                .toList();

        return ResponseEntity.ok(logs);
    }
}