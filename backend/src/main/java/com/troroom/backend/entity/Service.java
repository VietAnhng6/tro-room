package com.troroom.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "services")
public class Service {
    public enum CalculationMethod {
    BY_METER,
    BY_PERSON,
    FIXED_ROOM
}
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CalculationMethod calculationMethod;

    @Column(nullable = false)
    private String unit;

    @Column(nullable = false)
    private long price;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    public Service() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
    public CalculationMethod getCalculationMethod() {
    return calculationMethod;
}

public void setCalculationMethod(CalculationMethod calculationMethod) {
    this.calculationMethod = calculationMethod;
}

public String getUnit() {
    return unit;
}

public void setUnit(String unit) {
    this.unit = unit;
}

    public long getPrice() {
        return price;
    }

    public void setPrice(long price) {
        this.price = price;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}