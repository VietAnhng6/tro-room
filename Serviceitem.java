package com.troroom.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "service_items")
public class Serviceitem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Cách tính tiền: theo chỉ số, khoán theo đầu người, hoặc cố định theo phòng
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CalcMethod calcMethod;

    // Đơn vị tính, ví dụ: kWh, m3, người/tháng, tháng
    @Column(nullable = false)
    private String unit;

    @ManyToOne(optional = false)
    @JoinColumn(name = "landlord_id", nullable = false)
    private User landlord;

    @Column(nullable = false)
    private boolean active = true;

    // true nếu đây là 1 trong 5 dịch vụ hệ thống tạo sẵn (điện, nước, rác, gửi xe, internet)
    @Column(nullable = false)
    private boolean isDefault = false;

    public enum CalcMethod {
        THEO_CHI_SO,
        THEO_DAU_NGUOI,
        CO_DINH
    }

    public Serviceitem() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CalcMethod getCalcMethod() {
        return calcMethod;
    }

    public void setCalcMethod(CalcMethod calcMethod) {
        this.calcMethod = calcMethod;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public User getLandlord() {
        return landlord;
    }

    public void setLandlord(User landlord) {
        this.landlord = landlord;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean isDefault) {
        this.isDefault = isDefault;
    }
}