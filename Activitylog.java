package com.troroom.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Nhật ký thao tác - chỉ ghi và đọc, không entity/service nào được sửa hoặc xoá bản ghi này.
@Entity
@Table(name = "activity_logs")
public class Activitylog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(nullable = false)
    private Long actorId;

    @Column(nullable = false)
    private String actorName;

    @Column(nullable = false)
    private String actorRole;

    // CREATE, UPDATE, DELETE, DEACTIVATE...
    @Column(nullable = false)
    private String action;

    // Building, Room, ServiceItem, User, TenantProfile...
    @Column(nullable = false)
    private String entityType;

    private String entityId;

    // Mô tả giá trị trước/sau dạng văn bản, ví dụ: "rentPrice: 2000000 -> 2200000"
    @Column(length = 2000)
    private String detail;

    public Activitylog() {
    }

    public Long getId() {
        return id;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public Long getActorId() {
        return actorId;
    }

    public void setActorId(Long actorId) {
        this.actorId = actorId;
    }

    public String getActorName() {
        return actorName;
    }

    public void setActorName(String actorName) {
        this.actorName = actorName;
    }

    public String getActorRole() {
        return actorRole;
    }

    public void setActorRole(String actorRole) {
        this.actorRole = actorRole;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }
}