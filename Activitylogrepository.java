package com.troroom.backend.repository;

import com.troroom.backend.entity.Activitylog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface Activitylogrepository extends JpaRepository<Activitylog, Long> {

    @Query("SELECT a FROM Activitylog a WHERE " +
            "(:from IS NULL OR a.timestamp >= :from) AND " +
            "(:to IS NULL OR a.timestamp <= :to) AND " +
            "(:actorId IS NULL OR a.actorId = :actorId) AND " +
            "(:entityType IS NULL OR a.entityType = :entityType) " +
            "ORDER BY a.timestamp DESC")
    Page<Activitylog> search(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("actorId") Long actorId,
            @Param("entityType") String entityType,
            Pageable pageable
    );
}