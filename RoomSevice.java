package com.troroom.backend.service;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import com.troroom.backend.repository.Roomrepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoomSevice {

    public static final long MIN_RENT_PRICE = 500_000L;

    private final Roomrepository roomRepository;

    public RoomSevice(Roomrepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    // Mã phòng tự sinh theo mẫu: tầng * 100 + số thứ tự, ví dụ tầng 1 phòng 2 -> "102"
    public String generateRoomCode(int floor, int sequence) {
        return String.valueOf(floor * 100 + sequence);
    }

    public static class BulkCreateResult {
        public final List<Room> created = new ArrayList<>();
        public final List<String> skipped = new ArrayList<>();
    }

    /**
     * Tạo nhanh nhiều phòng theo mẫu số tầng và số phòng mỗi tầng (S1-08 AC 5).
     * Phòng đã tồn tại mã trùng trong toà nhà sẽ được bỏ qua và liệt kê trong skipped.
     */
    public BulkCreateResult bulkCreate(
            Building building,
            int floorFrom,
            int floorTo,
            int roomsPerFloor,
            double area,
            long rentPrice,
            int maxOccupants
    ) {
        BulkCreateResult result = new BulkCreateResult();

        for (int floor = floorFrom; floor <= floorTo; floor++) {
            for (int seq = 1; seq <= roomsPerFloor; seq++) {

                String code = generateRoomCode(floor, seq);

                boolean exists = roomRepository
                        .findByBuildingAndRoomCodeIgnoreCase(building, code)
                        .isPresent();

                if (exists) {
                    result.skipped.add(code);
                    continue;
                }

                Room room = new Room();
                room.setBuilding(building);
                room.setRoomCode(code);
                room.setFloor(floor);
                room.setArea(area);
                room.setRentPrice(rentPrice);
                room.setMaxOccupants(maxOccupants);
                room.setStatus(Room.Status.TRONG);

                result.created.add(roomRepository.save(room));
            }
        }

        return result;
    }
}