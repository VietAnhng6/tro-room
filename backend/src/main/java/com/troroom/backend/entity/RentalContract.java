package com.troroom.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "rental_contracts",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_rental_contract_code",
                        columnNames = "contract_code"
                )
        },
        indexes = {
                @Index(
                        name = "idx_rental_contract_tenant",
                        columnList = "tenant_id"
                ),
                @Index(
                        name = "idx_rental_contract_room",
                        columnList = "room_id"
                ),
                @Index(
                        name = "idx_rental_contract_request",
                        columnList = "request_id"
                )
        }
)
public class RentalContract {

    /**
     * Trạng thái lưu trữ của hợp đồng.
     * S4-04: hợp đồng chuyển sang {@link #ENDED} khi trả phòng và tất toán xong.
     */
    public enum Status {
        ACTIVE,
        ENDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_code", nullable = false, unique = true, length = 20)
    private String contractCode;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false, unique = true)
    private RentalRequest request;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(nullable = false)
    private long rent;

    @Column(nullable = false)
    private long deposit;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "term_months", nullable = false)
    private int termMonths;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "billing_cutoff_day", nullable = false)
    private int billingCutoffDay;

    @Column(name = "initial_electricity")
    private Integer initialElectricity;

    @Column(name = "initial_water")
    private Integer initialWater;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'ACTIVE'")
    private Status status = Status.ACTIVE;

    /** True when the landlord terminated this contract before its original end date. */
    @Column(name = "terminated")
    private Boolean terminated = false;

    /** Actual date the contract was ended early. */
    @Column(name = "terminated_at")
    private LocalDate terminatedAt;

    /** Reason recorded by the landlord when ending the contract early. */
    @Column(name = "termination_reason", length = 1000)
    private String terminationReason;

    public RentalContract() {
    }

    public Long getId() {
        return id;
    }

    public String getContractCode() {
        return contractCode;
    }

    public void setContractCode(String contractCode) {
        this.contractCode = contractCode;
    }

    public RentalRequest getRequest() {
        return request;
    }

    public void setRequest(RentalRequest request) {
        this.request = request;
    }

    public User getTenant() {
        return tenant;
    }

    public void setTenant(User tenant) {
        this.tenant = tenant;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public long getRent() {
        return rent;
    }

    public void setRent(long rent) {
        this.rent = rent;
    }

    public long getDeposit() {
        return deposit;
    }

    public void setDeposit(long deposit) {
        this.deposit = deposit;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public int getTermMonths() {
        return termMonths;
    }

    public void setTermMonths(int termMonths) {
        this.termMonths = termMonths;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public int getBillingCutoffDay() {
        return billingCutoffDay;
    }

    public void setBillingCutoffDay(int billingCutoffDay) {
        this.billingCutoffDay = billingCutoffDay;
    }

    public Integer getInitialElectricity() {
        return initialElectricity;
    }

    public void setInitialElectricity(Integer initialElectricity) {
        this.initialElectricity = initialElectricity;
    }

    public Integer getInitialWater() {
        return initialWater;
    }

    public void setInitialWater(Integer initialWater) {
        this.initialWater = initialWater;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Boolean getTerminated() {
        return terminated;
    }

    public void setTerminated(Boolean terminated) {
        this.terminated = terminated;
    }

    public LocalDate getTerminatedAt() {
        return terminatedAt;
    }

    public void setTerminatedAt(LocalDate terminatedAt) {
        this.terminatedAt = terminatedAt;
    }

    public String getTerminationReason() {
        return terminationReason;
    }

    public void setTerminationReason(String terminationReason) {
        this.terminationReason = terminationReason;
    }
}