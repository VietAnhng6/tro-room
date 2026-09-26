package com.troroom.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "rooms",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"building_id", "room_code"})
    }
)
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_code", nullable = false)
    private String roomCode;

    @ManyToOne(optional = false)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    @Column(nullable = false)
    private int floor;

    // Diện tích tính theo mét vuông
    @Column(nullable = false)
    private double area;

    // Giá thuê theo tháng, tính theo VND
    @Column(nullable = false)
    private long rentPrice;

    @Column(nullable = false)
    private int maxOccupants;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.TRONG;

    @Column(length = 1000)
    private String note;

    public enum Status {
        TRONG,
        DA_DAT_COC,
        DANG_THUE,
        NGUNG_CHO_THUE
    }

    public Room() {
    }

    public Long getId() {
        return id;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public Building getBuilding() {
        return building;
    }

    public void setBuilding(Building building) {
        this.building = building;
    }

    public int getFloor() {
        return floor;
    }

    public void setFloor(int floor) {
        this.floor = floor;
    }

    public double getArea() {
        return area;
    }

    public void setArea(double area) {
        this.area = area;
    }

    public long getRentPrice() {
        return rentPrice;
    }

    public void setRentPrice(long rentPrice) {
        this.rentPrice = rentPrice;
    }

    public int getMaxOccupants() {
        return maxOccupants;
    }

    public void setMaxOccupants(int maxOccupants) {
        this.maxOccupants = maxOccupants;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}