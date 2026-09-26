package com.troroom.backend.service;

import com.troroom.backend.entity.Activitylog;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.Activitylogrepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ActivityLogService {

    private final Activitylogrepository repository;

    public ActivityLogService(Activitylogrepository repository) {
        this.repository = repository;
    }

    public void log(
            User actor,
            String action,
            String entityType,
            String entityId,
            String detail
    ) {
        Activitylog log = new Activitylog();

        log.setActorId(actor.getId());
        log.setActorName(actor.getName());
        log.setActorRole(actor.getRole().name());
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setDetail(detail);

        repository.save(log);
    }

    public Page<Activitylog> search(
            LocalDateTime from,
            LocalDateTime to,
            Long actorId,
            String entityType,
            Pageable pageable
    ) {
        return repository.search(from, to, actorId, entityType, pageable);
    }
}