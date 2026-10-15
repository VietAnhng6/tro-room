package com.troroom.backend.entity;

import jakarta.persistence.*;

/**
 * S4-04: Một dòng khấu trừ trong bảng tất toán (hư hỏng, phạt cọc, ...).
 */
@Entity
@Table(
        name = "settlement_items",
        indexes = {
                @Index(
                        name = "idx_settlement_items_settlement",
                        columnList = "settlement_id"
                )
        }
)
public class SettlementItem {

    public enum Type {
        DAMAGE,          // Khấu trừ hư hỏng
        DEPOSIT_PENALTY, // Phạt cọc khi chấm dứt trước hạn
        OTHER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "settlement_id", nullable = false)
    private Settlement settlement;

    @Column(nullable = false, length = 150)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Type type;

    @Column(nullable = false)
    private long amount;

    public SettlementItem() {
    }

    public Long getId() {
        return id;
    }

    public Settlement getSettlement() {
        return settlement;
    }

    public void setSettlement(Settlement settlement) {
        this.settlement = settlement;
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

    public long getAmount() {
        return amount;
    }

    public void setAmount(long amount) {
        this.amount = amount;
    }
}
