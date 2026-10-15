package com.troroom.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * S3-06: Hoá đơn tháng của một phòng (theo hợp đồng) trong một kỳ.
 *
 * Mỗi hợp đồng chỉ có một hoá đơn cho một kỳ (yyyy-MM). Tổng tiền và các
 * khoản được lưu lại để tra cứu sau này, không phụ thuộc vào việc sửa đơn giá
 * hoặc chỉ số về sau.
 */
@Entity
@Table(
        name = "invoices",

        indexes = {
                @Index(
                        name = "idx_invoice_room_period",
                        columnList = "room_id,period"
                ),
                @Index(
                        name = "idx_invoice_status_due",
                        columnList = "status,due_date"
                )
        }
)
public class Invoice {

    public enum Status {
        DRAFT,      // Nháp: mới phát hành hàng loạt, chưa gửi cho khách
        ISSUED,     // Đã phát hành: khách nhìn thấy
        CANCELLED   // Đã huỷ (kèm lý do)
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_code", nullable = false, unique = true, length = 30)
    private String invoiceCode;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private RentalContract contract;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    /** Kỳ áp dụng, dạng yyyy-MM. */
    @Column(nullable = false, length = 7)
    private String period;

    @Column(name = "rent_amount", nullable = false)
    private long rentAmount;

    @Column(name = "total_amount", nullable = false)
    private long totalAmount;

    @Column(name = "paid_amount", columnDefinition = "BIGINT DEFAULT 0")
    private long paidAmount = 0L;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.DRAFT;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Khoá lạc quan: hai người sửa cùng lúc thì người lưu sau nhận lỗi. */
    @Version
    @Column(name = "row_version", nullable = false)
    private long version;

    public Invoice() {
    }

    public Long getId() {
        return id;
    }

    public String getInvoiceCode() {
        return invoiceCode;
    }

    public void setInvoiceCode(String invoiceCode) {
        this.invoiceCode = invoiceCode;
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

    public String getPeriod() {
        return period;
    }

    public void setPeriod(String period) {
        this.period = period;
    }

    public long getRentAmount() {
        return rentAmount;
    }

    public void setRentAmount(long rentAmount) {
        this.rentAmount = rentAmount;
    }

    public long getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(long totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDate getIssueDate() {
        return issueDate;
    }

    public void setIssueDate(LocalDate issueDate) {
        this.issueDate = issueDate;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

       public long getVersion() {
        return version;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public long getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(long paidAmount) {
        this.paidAmount = paidAmount;
    }

    public long getRemainingAmount() {
        return Math.max(0L, totalAmount - paidAmount);
    }

    public boolean isFullyPaid() {
        return paidAmount >= totalAmount;
    }
}

