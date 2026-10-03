package com.troroom.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Lịch sử mỗi lần đổi trạng thái của một yêu cầu thuê (S2-08). */
@Entity
@Table(name = "rental_request_history", indexes = {
        @Index(name = "idx_rr_history_request", columnList = "request_id, created_at")
})
public class RentalRequestHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private RentalRequest request;

    @Column(name = "from_status", length = 20)
    private String fromStatus; // null khi vừa tạo yêu cầu

    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public RentalRequestHistory() {}

    public RentalRequestHistory(RentalRequest request, String fromStatus, String toStatus, User actor, String note) {
        this.request = request; this.fromStatus = fromStatus; this.toStatus = toStatus;
        this.actor = actor; this.note = note; this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public RentalRequest getRequest() { return request; }
    public String getFromStatus() { return fromStatus; }
    public String getToStatus() { return toStatus; }
    public User getActor() { return actor; }
    public String getNote() { return note; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}