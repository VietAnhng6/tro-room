package com.troroom.backend.dto;

import com.troroom.backend.entity.Building;

public class BuildingResponse {

    private final Long id;
    private final String name;
    private final String address;
    private final int floors;
    private final String note;
    private final boolean active;
    private final Long managerId;
    private final String managerName;
    private final long roomCount;
    private final long vacantRoomCount;

    public BuildingResponse(Building building, long roomCount, long vacantRoomCount) {
        this.id = building.getId();
        this.name = building.getName();
        this.address = building.getAddress();
        this.floors = building.getFloors();
        this.note = building.getNote();
        this.active = building.isActive();
        this.managerId = building.getManager() == null ? null : building.getManager().getId();
        this.managerName = building.getManager() == null ? null : building.getManager().getName();
        this.roomCount = roomCount;
        this.vacantRoomCount = vacantRoomCount;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public int getFloors() {
        return floors;
    }

    public String getNote() {
        return note;
    }

    public boolean isActive() {
        return active;
    }

    public Long getManagerId() {
        return managerId;
    }

    public String getManagerName() {
        return managerName;
    }

    public long getRoomCount() {
        return roomCount;
    }

    public long getVacantRoomCount() {
        return vacantRoomCount;
    }
}