package com.troroom.backend.dto;

import java.util.List;

/** S3-05: các DTO của màn hình nhập chỉ số điện nước. */
public final class MeterReadingDtos {

    private MeterReadingDtos() {
    }

    public record BuildingItem(Long id, String name, String address) {
    }

    /** Một dòng phòng trên màn hình nhập. electricity/water null nghĩa là chưa chốt. */
    public record RoomItem(
            Long contractId,
            Long roomId,
            String roomCode,
            int floor,
            String tenantName,
            int prevElectricity,
            int prevWater,
            Integer electricity,
            Integer water,
            boolean recorded
    ) {
    }

    public record ListResponse(
            Long buildingId,
            String period,
            int total,
            int recorded,
            int remaining,
            List<RoomItem> rooms
    ) {
    }

    /** confirm = true nghĩa là người nhập đã xác nhận các cảnh báo tiêu thụ bất thường. */
    public record SaveRequest(
            Long contractId,
            String period,
            Integer electricity,
            Integer water,
            Boolean confirm
    ) {
    }

    public record SaveResponse(RoomItem room, int total, int recorded, int remaining) {
    }
}
