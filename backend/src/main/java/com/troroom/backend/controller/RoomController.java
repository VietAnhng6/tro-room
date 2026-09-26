package com.troroom.backend.controller;
import com.troroom.backend.dto.RoomResponse;
import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.RoomRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomRepository roomRepository;
    private final BuildingRepository buildingRepository;

    public RoomController(
            RoomRepository roomRepository,
            BuildingRepository buildingRepository
    ) {
        this.roomRepository = roomRepository;
        this.buildingRepository = buildingRepository;
    }

    @PostMapping
    public ResponseEntity<?> createRoom(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {

        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được tạo phòng"
                    ));
        }

        Long buildingId = request.get("buildingId") == null
                ? null
                : ((Number) request.get("buildingId")).longValue();

        String code = (String) request.get("code");

        Integer floor = request.get("floor") == null
                ? null
                : ((Number) request.get("floor")).intValue();

        Double area = request.get("area") == null
                ? null
                : ((Number) request.get("area")).doubleValue();

        Long rent = request.get("rent") == null
                ? null
                : ((Number) request.get("rent")).longValue();

        Integer maxPeople = request.get("maxPeople") == null
                ? null
                : ((Number) request.get("maxPeople")).intValue();

        if (buildingId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Phải chọn tòa nhà"
                    ));
        }

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Mã phòng không được để trống"
                    ));
        }

        if (floor == null || floor <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tầng phải lớn hơn 0"
                    ));
        }

        if (area == null || area <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Diện tích phải lớn hơn 0"
                    ));
        }

        if (rent == null || rent < 500000) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Giá thuê phải từ 500.000đ"
                    ));
        }

        if (maxPeople == null || maxPeople <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Số người tối đa phải lớn hơn 0"
                    ));
        }

        Building building = buildingRepository
                .findById(buildingId)
                .orElse(null);

        if (building == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Không tìm thấy tòa nhà"
                    ));
        }

        // Không cho Landlord tạo phòng trong tòa của người khác
        if (!building.getLandlord().getId().equals(landlord.getId())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền quản lý tòa nhà này"
                    ));
        }

        if (floor > building.getFloors()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tầng phòng vượt quá số tầng của tòa nhà"
                    ));
        }

        if (roomRepository.existsByBuildingAndCode(
                building,
                code.trim()
        )) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Mã phòng đã tồn tại trong tòa nhà"
                    ));
        }

        Room room = new Room();

        room.setCode(code.trim());
        room.setBuilding(building);
        room.setFloor(floor);
        room.setArea(area);
        room.setRent(rent);
        room.setMaxPeople(maxPeople);
        room.setStatus(Room.Status.EMPTY);

        roomRepository.save(room);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Tạo phòng thành công",
                        "roomId",
                        room.getId()
                )
        );
    }
    @GetMapping
public ResponseEntity<?> getRooms(
        Authentication authentication,
        @RequestParam Long buildingId,
        @RequestParam(required = false) Integer floor
) {

    User landlord = (User) authentication.getPrincipal();

    if (!"LANDLORD".equals(landlord.getRole().name())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Chỉ chủ trọ mới được xem phòng"
                ));
    }

    Building building = buildingRepository
            .findById(buildingId)
            .orElse(null);

    if (building == null) {
        return ResponseEntity.notFound().build();
    }

    if (!building.getLandlord().getId().equals(landlord.getId())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền xem phòng của tòa nhà này"
                ));
    }

    if (floor != null) {
    return ResponseEntity.ok(
            roomRepository.findByBuildingAndFloor(building, floor)
                    .stream()
                    .map(room -> new RoomResponse(
                            room.getId(),
                            room.getCode(),
                            room.getFloor(),
                            room.getArea(),
                            room.getRent(),
                            room.getMaxPeople(),
                            room.getStatus(),
                            room.getBuilding().getId(),
                            room.getBuilding().getName()
                    ))
                    .toList()
    );
}

return ResponseEntity.ok(
        roomRepository.findByBuilding(building)
                .stream()
                .map(room -> new RoomResponse(
                        room.getId(),
                        room.getCode(),
                        room.getFloor(),
                        room.getArea(),
                        room.getRent(),
                        room.getMaxPeople(),
                        room.getStatus(),
                        room.getBuilding().getId(),
                        room.getBuilding().getName()
                ))
                .toList()
);
}
@PutMapping("/{id}")
public ResponseEntity<?> updateRoom(
        Authentication authentication,
        @PathVariable Long id,
        @RequestBody Map<String, Object> request
) {
    User landlord = (User) authentication.getPrincipal();

    if (!"LANDLORD".equals(landlord.getRole().name())) {
        return ResponseEntity.status(403)
                .body(Map.of("message", "Chỉ chủ trọ mới được sửa phòng"));
    }

    Room room = roomRepository.findById(id).orElse(null);

    if (room == null) {
        return ResponseEntity.notFound().build();
    }

    if (!room.getBuilding().getLandlord().getId().equals(landlord.getId())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền sửa phòng này"
                ));
    }

    String code = (String) request.get("code");
    Integer floor = request.get("floor") == null
            ? null
            : ((Number) request.get("floor")).intValue();

    Double area = request.get("area") == null
            ? null
            : ((Number) request.get("area")).doubleValue();

    Long rent = request.get("rent") == null
            ? null
            : ((Number) request.get("rent")).longValue();

    Integer maxPeople = request.get("maxPeople") == null
            ? null
            : ((Number) request.get("maxPeople")).intValue();

    if (code == null || code.isBlank()) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Mã phòng không được để trống"));
    }

    if (floor == null || floor <= 0) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Tầng phải lớn hơn 0"));
    }

    if (area == null || area <= 0) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Diện tích phải lớn hơn 0"));
    }

    if (rent == null || rent < 500000) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Giá thuê phải từ 500.000đ"));
    }

    if (maxPeople == null || maxPeople <= 0) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Số người tối đa phải lớn hơn 0"));
    }

    if (floor > room.getBuilding().getFloors()) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Tầng phòng vượt quá số tầng của tòa nhà"
                ));
    }

    String newCode = code.trim();

    if (!newCode.equals(room.getCode())
            && roomRepository.existsByBuildingAndCode(
                    room.getBuilding(),
                    newCode
            )) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Mã phòng đã tồn tại trong tòa nhà"
                ));
    }

    room.setCode(newCode);
    room.setFloor(floor);
    room.setArea(area);
    room.setRent(rent);
    room.setMaxPeople(maxPeople);

    roomRepository.save(room);

    return ResponseEntity.ok(
            Map.of("message", "Cập nhật phòng thành công")
    );
}
@PutMapping("/{id}/status")
public ResponseEntity<?> updateRoomStatus(
        Authentication authentication,
        @PathVariable Long id,
        @RequestBody Map<String, Object> request
) {
    User landlord = (User) authentication.getPrincipal();

    if (!"LANDLORD".equals(landlord.getRole().name())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Chỉ chủ trọ mới được đổi trạng thái phòng"
                ));
    }

    Room room = roomRepository.findById(id).orElse(null);

    if (room == null) {
        return ResponseEntity.notFound().build();
    }

    if (!room.getBuilding().getLandlord().getId().equals(landlord.getId())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền đổi trạng thái phòng này"
                ));
    }

    String statusValue = (String) request.get("status");

    if (statusValue == null || statusValue.isBlank()) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Trạng thái không được để trống"
                ));
    }

    Room.Status status;

    try {
        status = Room.Status.valueOf(statusValue.toUpperCase());
    } catch (IllegalArgumentException e) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Trạng thái không hợp lệ. Dùng EMPTY, DEPOSITED, RENTED hoặc STOPPED"
                ));
    }

    room.setStatus(status);
    roomRepository.save(room);

    return ResponseEntity.ok(
            Map.of(
                    "message", "Cập nhật trạng thái phòng thành công",
                    "status", room.getStatus().name()
            )
    );
}
}