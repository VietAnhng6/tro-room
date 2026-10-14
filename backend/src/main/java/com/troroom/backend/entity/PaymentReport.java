package com.troroom.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * S4-01: Khách thuê báo đã thanh toán hóa đơn,
 * kèm thông tin thanh toán và ảnh chứng từ.
 */
@Entity
@Table(
        name = "payment_reports",
        indexes = {
                @Index(
                        name = "idx_payment_report_invoice_status",
                        columnList = "invoice_id,status"
                ),
                @Index(
                        name = "idx_payment_report_tenant",
                        columnList = "tenant_id"
                )
        }
)
    public class PaymentReport {

        public enum PaymentMethod {
            CASH,       // Tiền mặt
            TRANSFER    // Chuyển khoản
        }

    
    public enum Status {
        PENDING,    // Chờ chủ nhà xác nhận
        CONFIRMED,  // Đã xác nhận
        CANCELLED,  // Khách thuê đã hủy
        REJECTED    // Chủ nhà từ chối
    }


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private User tenant;

    /** Số tiền khách khai báo đã thanh toán, đơn vị VNĐ. */
    @Column(name = "amount", nullable = false)
    private long amount;

    /** Ngày khách thực hiện thanh toán. */
    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    /** Đường dẫn lưu ảnh chứng từ, không phải URL công khai. */
    @Column(name = "proof_image_path", length = 500)
    private String proofImagePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Version
    @Column(name = "row_version", nullable = false)
    private long version;

    public PaymentReport() {
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.PENDING;
        }
    }

    public Long getId() {
        return id;
    }

    public Invoice getInvoice() {
        return invoice;
    }

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public User getTenant() {
        return tenant;
    }

    public void setTenant(User tenant) {
        this.tenant = tenant;
    }

    public long getAmount() {
        return amount;
    }

    public void setAmount(long amount) {
        this.amount = amount;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getProofImagePath() {
        return proofImagePath;
    }

    public void setProofImagePath(String proofImagePath) {
        this.proofImagePath = proofImagePath;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public long getVersion() {
        return version;
    }
}