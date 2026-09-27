package com.troroom.backend.repository;

import com.troroom.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
        SELECT a
        FROM AuditLog a
        WHERE a.timestamp >= COALESCE(:from, a.timestamp)
          AND a.timestamp <= COALESCE(:to, a.timestamp)
          AND a.actor.id = COALESCE(:actorId, a.actor.id)
          AND a.objectType = COALESCE(:objectType, a.objectType)
        ORDER BY a.timestamp DESC
    """)
    List<AuditLog> search(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("actorId") Long actorId,
            @Param("objectType") String objectType
    );
}