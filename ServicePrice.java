package com.troroom.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_prices")
public class ServicePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "service_item_id", nullable = false)
    private Serviceitem serviceItem;

    @Column(nullable = false)
    private long unitPrice;

    // Ngày bắt đầu hiệu lực của đơn giá này
    @Column(nullable = false)
    private LocalDate effectiveFrom;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public ServicePrice() {
    }

    public Long getId() {
        return id;
    }

    public Serviceitem getServiceItem() {
        return serviceItem;
    }

    public void setServiceItem(Serviceitem serviceItem) {
        this.serviceItem = serviceItem;
    }

    public long getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(long unitPrice) {
        this.unitPrice = unitPrice;
    }

    public LocalDate getEffectiveFrom() {
        return effectiveFrom;
    }

    public void setEffectiveFrom(LocalDate effectiveFrom) {
        this.effectiveFrom = effectiveFrom;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}