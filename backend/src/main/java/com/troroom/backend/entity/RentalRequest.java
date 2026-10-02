package com.troroom.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "rental_requests",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_rental_request_code",
                        columnNames = "request_code"
                )
        },
        indexes = {
                @Index(
                        name = "idx_rental_requests_listing_tenant_status",
                        columnList = "listing_id,tenant_id,status"
                ),
                @Index(
                        name = "idx_rental_requests_tenant_created",
                        columnList = "tenant_id,created_at"
                )
        }
)
public class RentalRequest {

    public enum Type {
        VIEWING,
        RENT_NOW
    }

    public enum Status {
        OPEN,
        ACCEPTED,
        REJECTED,
        CANCELLED,
        COMPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_code", nullable = false, unique = true, length = 20)
    private String requestCode;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    private Listing listing;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    @Column(name = "desired_date", nullable = false)
    private LocalDate desiredDate;

    @Column(name = "expected_people", nullable = false)
    private int expectedPeople;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.OPEN;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public RentalRequest() {
    }

    public Long getId() { return id; }
    public String getRequestCode() { return requestCode; }
    public void setRequestCode(String requestCode) { this.requestCode = requestCode; }
    public Listing getListing() { return listing; }
    public void setListing(Listing listing) { this.listing = listing; }
    public User getTenant() { return tenant; }
    public void setTenant(User tenant) { this.tenant = tenant; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public LocalDate getDesiredDate() { return desiredDate; }
    public void setDesiredDate(LocalDate desiredDate) { this.desiredDate = desiredDate; }
    public int getExpectedPeople() { return expectedPeople; }
    public void setExpectedPeople(int expectedPeople) { this.expectedPeople = expectedPeople; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
