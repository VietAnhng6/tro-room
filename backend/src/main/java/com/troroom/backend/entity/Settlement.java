package com.troroom.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * S4-04: Bảng tất toán khi trả phòng.
 *
 * Lưu toàn bộ số liệu tại thời điểm tất toán để hai bên cùng nhìn một bảng số
 * liệu cố định, không phụ thuộc vào việc dữ liệu gốc bị thay đổi về sau.
 */
@Entity
@Table(
        name = "settlements",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_settlement_contract",
                        columnNames = "contract_id"
                )
        },
        indexes = {
                @Index(
                        name = "idx_settlement_room",
                        columnList = "room_id"
                )
        }
)
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private RentalContract contract;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "checkout_date", nullable = false)
    private LocalDate checkoutDate;

    @Column(name = "last_electricity", nullable = false)
    private int lastElectricity;

    @Column(name = "last_water", nullable = false)
    private int lastWater;

    @Column(name = "final_electricity", nullable = false)
    private int finalElectricity;

    @Column(name = "final_water", nullable = false)
    private int finalWater;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "final_invoice_id")
    private Invoice finalInvoice;

    @Column(name = "deposit_amount", nullable = false)
    private long depositAmount;

    @Column(name = "total_deductions", nullable = false)
    private long totalDeductions;

    @Column(name = "previous_debt", nullable = false)
    private long previousDebt;

    @Column(name = "final_invoice_amount", nullable = false)
    private long finalInvoiceAmount;

    /**
     * Số tiền hoàn lại cho khách. Âm nghĩa là khách còn phải trả thêm
     * (số dương của giá trị âm là số tiền phải trả thêm).
     */
    @Column(name = "refund_amount", nullable = false)
    private long refundAmount;

    @Column(name = "early_terminated", nullable = false)
    private boolean earlyTerminated;

    @Column(name = "termination_reason", length = 1000)
    private String terminationReason;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Settlement() {
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

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public LocalDate getCheckoutDate() {
        return checkoutDate;
    }

    public void setCheckoutDate(LocalDate checkoutDate) {
        this.checkoutDate = checkoutDate;
    }

    public int getLastElectricity() {
        return lastElectricity;
    }

    public void setLastElectricity(int lastElectricity) {
        this.lastElectricity = lastElectricity;
    }

    public int getLastWater() {
        return lastWater;
    }

    public void setLastWater(int lastWater) {
        this.lastWater = lastWater;
    }

    public int getFinalElectricity() {
        return finalElectricity;
    }

    public void setFinalElectricity(int finalElectricity) {
        this.finalElectricity = finalElectricity;
    }

    public int getFinalWater() {
        return finalWater;
    }

    public void setFinalWater(int finalWater) {
        this.finalWater = finalWater;
    }

    public Invoice getFinalInvoice() {
        return finalInvoice;
    }

    public void setFinalInvoice(Invoice finalInvoice) {
        this.finalInvoice = finalInvoice;
    }

    public long getDepositAmount() {
        return depositAmount;
    }

    public void setDepositAmount(long depositAmount) {
        this.depositAmount = depositAmount;
    }

    public long getTotalDeductions() {
        return totalDeductions;
    }

    public void setTotalDeductions(long totalDeductions) {
        this.totalDeductions = totalDeductions;
    }

    public long getPreviousDebt() {
        return previousDebt;
    }

    public void setPreviousDebt(long previousDebt) {
        this.previousDebt = previousDebt;
    }

    public long getFinalInvoiceAmount() {
        return finalInvoiceAmount;
    }

    public void setFinalInvoiceAmount(long finalInvoiceAmount) {
        this.finalInvoiceAmount = finalInvoiceAmount;
    }

    public long getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(long refundAmount) {
        this.refundAmount = refundAmount;
    }

    public boolean isEarlyTerminated() {
        return earlyTerminated;
    }

    public void setEarlyTerminated(boolean earlyTerminated) {
        this.earlyTerminated = earlyTerminated;
    }

    public String getTerminationReason() {
        return terminationReason;
    }

    public void setTerminationReason(String terminationReason) {
        this.terminationReason = terminationReason;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
