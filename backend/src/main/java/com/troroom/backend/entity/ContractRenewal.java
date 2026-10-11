
package com.troroom.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "contract_renewals",
        indexes = {
                @Index(
                        name = "idx_contract_renewal_contract",
                        columnList = "contract_id"
                )
        }
)
public class ContractRenewal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private RentalContract contract;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "term_months", nullable = false)
    private int termMonths;

    @Column(name = "rent", nullable = false)
    private long rent;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "renewed_by", nullable = false)
    private User renewedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public ContractRenewal() {
    }

    public Long getId() {
        return id;
    }

    public RentalContract getContract() {
        return contract;
    }

    public void setContract(RentalContract contract) {
        this.contract = contract;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public int getTermMonths() {
        return termMonths;
    }

    public void setTermMonths(int termMonths) {
        this.termMonths = termMonths;
    }

    public long getRent() {
        return rent;
    }

    public void setRent(long rent) {
        this.rent = rent;
    }

    public User getRenewedBy() {
        return renewedBy;
    }

    public void setRenewedBy(User renewedBy) {
        this.renewedBy = renewedBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}