package com.troroom.backend.entity;

import jakarta.persistence.*;

/**
 * S3-06: Một dòng khoản mục trong hoá đơn.
 *
 * Gồm tiền phòng, tiền điện, tiền nước, dịch vụ cố định và khoản khoán theo
 * đầu người. Với điện/nước, {@code previousReading}/{@code currentReading}
 * lưu chỉ số đầu kỳ/cuối kỳ để khách đối chiếu mà không cần đọc lại bảng chỉ số.
 */
@Entity
@Table(name = "invoice_items")
public class InvoiceItem {

    public enum Type {
        RENT,           // Tiền phòng
        ELECTRICITY,    // Tiền điện
        WATER,          // Tiền nước
        FIXED_SERVICE,  // Dịch vụ cố định theo phòng
        PERSON_SERVICE  // Khoản khoán theo đầu người
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(nullable = false, length = 150)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    /** Số lượng: đơn vị tiêu thụ (điện/nước), số người, hoặc 1 cho khoản cố định. */
    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(name = "unit_price", nullable = false)
    private long unitPrice;

    @Column(nullable = false)
    private long amount;

    @Column(name = "previous_reading")
    private Integer previousReading;

    @Column(name = "current_reading")
    private Integer currentReading;

    public InvoiceItem() {
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

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public long getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(long unitPrice) {
        this.unitPrice = unitPrice;
    }

    public long getAmount() {
        return amount;
    }

    public void setAmount(long amount) {
        this.amount = amount;
    }

    public Integer getPreviousReading() {
        return previousReading;
    }

    public void setPreviousReading(Integer previousReading) {
        this.previousReading = previousReading;
    }

    public Integer getCurrentReading() {
        return currentReading;
    }

    public void setCurrentReading(Integer currentReading) {
        this.currentReading = currentReading;
    }
}
