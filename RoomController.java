package com.troroom.backend.controller;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.Roomrepository;
import com.troroom.backend.service.ActivityLogService;
import com.troroom.backend.service.RoomSevice;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final Roomrepository roomRepository;
    private final BuildingRepository buildingRepository;
    private final RoomSevice roomService;
    private final ActivityLogService activityLogService;

    public RoomController(
            Roomrepository roomRepository,
            BuildingRepository buildingRepository,
            RoomSevice roomService,
            ActivityLogService activityLogService
    ) {
        this.roomRepository = roomRepository;
        this.buildingRepository = buildingRepository;
        this.roomService = roomService;
        this.activityLogService = activityLogService;
    }

    // Chủ nhà xem phòng của toà mình; quản lý toà xem phòng của toà được phân công.
    private ResponseEntity<?> checkCanView(User user, Building building) {

        boolean isOwner = "LANDLORD".equals(user.getRole().name())
                && building.getLandlord().getId().equals(user.getId());

        boolean isManager = "MANAGER".equals(user.getRole().name())
                && building.getManager() != null
                && building.getManager().getId().equals(user.getId());

        if (isOwner || isManager || "ADMIN".equals(user.getRole().name())) {
            return null;
        }

        return ResponseEntity.status(403)
                .body(Map.of("message", "Bạn không có quyền xem phòng của toà nhà này"));
    }

    @GetMapping
    public ResponseEntity<?> getRooms(
            Authentication authentication,
            @RequestParam Long buildingId
    ) {
        User user = (User) authentication.getPrincipal();

        Building building = buildingRepository.findById(buildingId).orElse(null);

        if (building == null) {
            return ResponseEntity.notFound().build();
        }

        ResponseEntity<?> denied = checkCanView(user, building);
        if (denied != null) {
            return denied;
        }

        List<Room> rooms = roomRepository.findByBuildingOrderByFloorAscRoomCodeAsc(building);

        return ResponseEntity.ok(rooms);
    }

    @PostMapping
    public ResponseEntity<?> createRoom(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {
        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Chỉ chủ trọ mới được khai báo phòng"));
        }

        Long buildingId = request.get("buildingId") == null
                ? null : ((Number) request.get("buildingId")).longValue();

        Building building = buildingId == null ? null : buildingRepository.findById(buildingId).orElse(null);

        if (building == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy toà nhà"));
        }

        if (!building.getLandlord().getId().equals(landlord.getId())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Bạn không có quyền thêm phòng cho toà nhà này"));
        }

        String roomCode = (String) request.get("roomCode");
        Integer floor = request.get("floor") == null ? null : ((Number) request.get("floor")).intValue();
        Double area = request.get("area") == null ? null : ((Number) request.get("area")).doubleValue();
        Long rentPrice = request.get("rentPrice") == null ? null : ((Number) request.get("rentPrice")).longValue();
        Integer maxOccupants = request.get("maxOccupants") == null ? null : ((Number) request.get("maxOccupants")).intValue();
        String note = (String) request.get("note");

        ResponseEntity<?> validationError = validate(roomCode, floor, area, rentPrice, maxOccupants);
        if (validationError != null) {
            return validationError;
        }

        if (roomRepository.findByBuildingAndRoomCodeIgnoreCase(building, roomCode).isPresent()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Mã phòng đã tồn tại trong toà nhà này"));
        }

        Room room = new Room();
        room.setBuilding(building);
        room.setRoomCode(roomCode.trim());
        room.setFloor(floor);
        room.setArea(area);
        room.setRentPrice(rentPrice);
        room.setMaxOccupants(maxOccupants);
        room.setNote(note);
        room.setStatus(Room.Status.TRONG);

        roomRepository.save(room);

        activityLogService.log(
                landlord, "CREATE", "Room", String.valueOf(room.getId()),
                "Tạo phòng " + room.getRoomCode() + " tại toà " + building.getName()
        );

        return ResponseEntity.ok(Map.of("message", "Tạo phòng thành công", "roomId", room.getId()));
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> bulkCreateRooms(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {
        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Chỉ chủ trọ mới được khai báo phòng"));
        }

        Long buildingId = request.get("buildingId") == null
                ? null : ((Number) request.get("buildingId")).longValue();

        Building building = buildingId == null ? null : buildingRepository.findById(buildingId).orElse(null);

        if (building == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy toà nhà"));
        }

        if (!building.getLandlord().getId().equals(landlord.getId())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Bạn không có quyền thêm phòng cho toà nhà này"));
        }

        Integer floorFrom = request.get("floorFrom") == null ? null : ((Number) request.get("floorFrom")).intValue();
        Integer floorTo = request.get("floorTo") == null ? null : ((Number) request.get("floorTo")).intValue();
        Integer roomsPerFloor = request.get("roomsPerFloor") == null ? null : ((Number) request.get("roomsPerFloor")).intValue();
        Double area = request.get("area") == null ? null : ((Number) request.get("area")).doubleValue();
        Long rentPrice = request.get("rentPrice") == null ? null : ((Number) request.get("rentPrice")).longValue();
        Integer maxOccupants = request.get("maxOccupants") == null ? null : ((Number) request.get("maxOccupants")).intValue();

        if (floorFrom == null || floorTo == null || floorFrom <= 0 || floorTo < floorFrom) {
            return ResponseEntity.badRequest().body(Map.of("message", "Khoảng tầng không hợp lệ"));
        }

        if (roomsPerFloor == null || roomsPerFloor <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số phòng mỗi tầng phải lớn hơn 0"));
        }

        if (floorTo > building.getFloors()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Toà nhà chỉ có " + building.getFloors() + " tầng"));
        }

        ResponseEntity<?> validationError = validate("TAM", 1, area, rentPrice, maxOccupants);
        if (validationError != null) {
            return validationError;
        }

        RoomSevice.BulkCreateResult result = roomService.bulkCreate(
                building, floorFrom, floorTo, roomsPerFloor, area, rentPrice, maxOccupants
        );

        activityLogService.log(
                landlord, "CREATE", "Room", null,
                "Tạo hàng loạt " + result.created.size() + " phòng cho toà " + building.getName()
                        + (result.skipped.isEmpty() ? "" : ", bỏ qua trùng mã: " + result.skipped)
        );

        return ResponseEntity.ok(Map.of(
                "message", "Đã tạo " + result.created.size() + " phòng",
                "createdCount", result.created.size(),
                "skippedRoomCodes", result.skipped
        ));
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
                    .body(Map.of("message", "Bạn không có quyền sửa phòng này"));
        }

        Double area = request.get("area") == null ? room.getArea() : ((Number) request.get("area")).doubleValue();
        Long rentPrice = request.get("rentPrice") == null ? room.getRentPrice() : ((Number) request.get("rentPrice")).longValue();
        Integer maxOccupants = request.get("maxOccupants") == null ? room.getMaxOccupants() : ((Number) request.get("maxOccupants")).intValue();
        String note = request.containsKey("note") ? (String) request.get("note") : room.getNote();
        String statusStr = (String) request.get("status");

        ResponseEntity<?> validationError = validate(room.getRoomCode(), room.getFloor(), area, rentPrice, maxOccupants);
        if (validationError != null) {
            return validationError;
        }

        String before = "rentPrice: " + room.getRentPrice() + ", status: " + room.getStatus();

        room.setArea(area);
        room.setRentPrice(rentPrice);
        room.setMaxOccupants(maxOccupants);
        room.setNote(note);

        if (statusStr != null) {
            try {
                room.setStatus(Room.Status.valueOf(statusStr));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Trạng thái phòng không hợp lệ"));
            }
        }

        roomRepository.save(room);

        activityLogService.log(
                landlord, "UPDATE", "Room", String.valueOf(room.getId()),
                before + " -> rentPrice: " + room.getRentPrice() + ", status: " + room.getStatus()
        );

        return ResponseEntity.ok(Map.of("message", "Cập nhật phòng thành công"));
    }

    private ResponseEntity<?> validate(
            String roomCode, Integer floor, Double area, Long rentPrice, Integer maxOccupants
    ) {
        if (roomCode == null || roomCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mã phòng không được để trống"));
        }

        if (floor == null || floor <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tầng không hợp lệ"));
        }

        if (area == null || area <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Diện tích phải lớn hơn 0"));
        }

        if (rentPrice == null || rentPrice < RoomSevice.MIN_RENT_PRICE) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Giá thuê tối thiểu " + RoomSevice.MIN_RENT_PRICE + " VND"));
        }

        if (maxOccupants == null || maxOccupants <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Số người ở tối đa phải lớn hơn 0"));
        }

        return null;
    }
}