package com.troroom.backend.controller;

import com.troroom.backend.dto.RoomResponse;
import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.service.AuditLogService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomRepository roomRepository;
    private final BuildingRepository buildingRepository;
    private final AuditLogService auditLogService;

    public RoomController(
            RoomRepository roomRepository,
            BuildingRepository buildingRepository,
            AuditLogService auditLogService
    ) {
        this.roomRepository = roomRepository;
        this.buildingRepository = buildingRepository;
        this.auditLogService = auditLogService;
    }

    /*
     * =========================================================
     * KIỂM TRA ROLE
     * =========================================================
     */

    private boolean isLandlord(User user) {
        return "LANDLORD".equals(user.getRole().name());
    }

    private boolean isManager(User user) {
        return "MANAGER".equals(user.getRole().name());
    }

    /*
     * LANDLORD:
     *   quản lý tòa nhà do mình sở hữu
     *
     * MANAGER:
     *   quản lý tòa nhà được giao cho mình
     */
    private boolean canManageBuilding(User user, Building building) {

        if (building == null) {
            return false;
        }

        if (isLandlord(user)) {

            return building.getLandlord() != null
                    && building.getLandlord()
                            .getId()
                            .equals(user.getId());
        }

        if (isManager(user)) {

            return building.getManager() != null
                    && building.getManager()
                            .getId()
                            .equals(user.getId());
        }

        return false;
    }

    /*
     * =========================================================
     * TẠO PHÒNG
     * LANDLORD + MANAGER
     * =========================================================
     */
    @PostMapping
    public ResponseEntity<?> createRoom(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {

        User currentUser =
                (User) authentication.getPrincipal();

        if (!isLandlord(currentUser) && !isManager(currentUser)) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền tạo phòng"
                    ));
        }

        Long buildingId =
                request.get("buildingId") == null
                        ? null
                        : ((Number) request.get("buildingId"))
                                .longValue();

        String code =
                (String) request.get("code");

        Integer floor =
                request.get("floor") == null
                        ? null
                        : ((Number) request.get("floor"))
                                .intValue();

        Double area =
                request.get("area") == null
                        ? null
                        : ((Number) request.get("area"))
                                .doubleValue();

        Long rent =
                request.get("rent") == null
                        ? null
                        : ((Number) request.get("rent"))
                                .longValue();

        Integer maxPeople =
                request.get("maxPeople") == null
                        ? null
                        : ((Number) request.get("maxPeople"))
                                .intValue();

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

        Building building =
                buildingRepository
                        .findById(buildingId)
                        .orElse(null);

        if (building == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Không tìm thấy tòa nhà"
                    ));
        }

        /*
         * Kiểm tra quyền với tòa nhà
         */
        if (!canManageBuilding(currentUser, building)) {

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

        auditLogService.log(
                currentUser,
                "CREATE",
                "ROOM",
                room.getId(),
                null,
                Map.of(
                        "id", room.getId(),
                        "code", room.getCode(),
                        "buildingId", building.getId(),
                        "floor", room.getFloor(),
                        "area", room.getArea(),
                        "rent", room.getRent(),
                        "maxPeople", room.getMaxPeople(),
                        "status", room.getStatus().name()
                )
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Tạo phòng thành công",
                        "roomId",
                        room.getId()
                )
        );
    }

    /*
     * =========================================================
     * XEM DANH SÁCH PHÒNG
     * LANDLORD + MANAGER
     * =========================================================
     */
    @GetMapping
public ResponseEntity<?> getRooms(
        Authentication authentication,
        @RequestParam(required = false) Long buildingId,
        @RequestParam(required = false) Integer floor
) {
    User currentUser = (User) authentication.getPrincipal();

    if (!isLandlord(currentUser) && !isManager(currentUser)) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền xem phòng"
                ));
    }

    List<Room> rooms;

    // Không chọn tòa nhà
    if (buildingId == null) {

        if (isLandlord(currentUser)) {
            rooms = floor == null
                    ? roomRepository.findByBuilding_Landlord(currentUser)
                    : roomRepository.findByBuilding_LandlordAndFloor(
                            currentUser, floor
                    );
        } else {
            rooms = floor == null
                    ? roomRepository.findByBuilding_Manager(currentUser)
                    : roomRepository.findByBuilding_ManagerAndFloor(
                            currentUser, floor
                    );
        }

    } else {

        // Có chọn tòa nhà
        Building building = buildingRepository
                .findById(buildingId)
                .orElse(null);

        if (building == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canManageBuilding(currentUser, building)) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền xem phòng của tòa nhà này"
                    ));
        }

        rooms = floor == null
                ? roomRepository.findByBuilding(building)
                : roomRepository.findByBuildingAndFloor(
                        building, floor
                );
    }

    return ResponseEntity.ok(
            rooms.stream()
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

    /*
     * =========================================================
     * SỬA PHÒNG
     * LANDLORD + MANAGER
     * =========================================================
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRoom(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {

        User currentUser =
                (User) authentication.getPrincipal();

        if (!isLandlord(currentUser) && !isManager(currentUser)) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền sửa phòng"
                    ));
        }

        Room room =
                roomRepository
                        .findById(id)
                        .orElse(null);

        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        Building building = room.getBuilding();

        if (!canManageBuilding(currentUser, building)) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền sửa phòng này"
                    ));
        }

        String code =
                (String) request.get("code");

        Integer floor =
                request.get("floor") == null
                        ? null
                        : ((Number) request.get("floor"))
                                .intValue();

        Double area =
                request.get("area") == null
                        ? null
                        : ((Number) request.get("area"))
                                .doubleValue();

        Long rent =
                request.get("rent") == null
                        ? null
                        : ((Number) request.get("rent"))
                                .longValue();

        Integer maxPeople =
                request.get("maxPeople") == null
                        ? null
                        : ((Number) request.get("maxPeople"))
                                .intValue();

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

        if (floor > building.getFloors()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tầng phòng vượt quá số tầng của tòa nhà"
                    ));
        }

        String newCode = code.trim();

        if (!newCode.equals(room.getCode())
                && roomRepository.existsByBuildingAndCode(
                        building,
                        newCode
                )) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Mã phòng đã tồn tại trong tòa nhà"
                    ));
        }

        Map<String, Object> beforeData =
                Map.of(
                        "id", room.getId(),
                        "code", room.getCode(),
                        "floor", room.getFloor(),
                        "area", room.getArea(),
                        "rent", room.getRent(),
                        "maxPeople", room.getMaxPeople(),
                        "status", room.getStatus().name()
                );

        room.setCode(newCode);
        room.setFloor(floor);
        room.setArea(area);
        room.setRent(rent);
        room.setMaxPeople(maxPeople);

        roomRepository.save(room);

        auditLogService.log(
                currentUser,
                "UPDATE",
                "ROOM",
                room.getId(),
                beforeData,
                Map.of(
                        "id", room.getId(),
                        "code", room.getCode(),
                        "floor", room.getFloor(),
                        "area", room.getArea(),
                        "rent", room.getRent(),
                        "maxPeople", room.getMaxPeople(),
                        "status", room.getStatus().name()
                )
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Cập nhật phòng thành công"
                )
        );
    }

    /*
     * =========================================================
     * ĐỔI TRẠNG THÁI PHÒNG
     * LANDLORD + MANAGER
     * =========================================================
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateRoomStatus(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {

        User currentUser =
                (User) authentication.getPrincipal();

        if (!isLandlord(currentUser) && !isManager(currentUser)) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền đổi trạng thái phòng"
                    ));
        }

        Room room =
                roomRepository
                        .findById(id)
                        .orElse(null);

        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canManageBuilding(
                currentUser,
                room.getBuilding()
        )) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền đổi trạng thái phòng này"
                    ));
        }

        String statusValue =
                (String) request.get("status");

        if (statusValue == null || statusValue.isBlank()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Trạng thái không được để trống"
                    ));
        }

        Room.Status status;

        try {

            status =
                    Room.Status.valueOf(
                            statusValue.toUpperCase()
                    );

        } catch (IllegalArgumentException e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Trạng thái không hợp lệ. Dùng EMPTY, DEPOSITED, RENTED hoặc STOPPED"
                    ));
        }

        Map<String, Object> beforeData =
                Map.of(
                        "id", room.getId(),
                        "code", room.getCode(),
                        "status", room.getStatus().name()
                );

        room.setStatus(status);

        roomRepository.save(room);

        auditLogService.log(
                currentUser,
                "UPDATE",
                "ROOM",
                room.getId(),
                beforeData,
                Map.of(
                        "id", room.getId(),
                        "code", room.getCode(),
                        "status", room.getStatus().name()
                )
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Cập nhật trạng thái phòng thành công",
                        "status",
                        room.getStatus().name()
                )
        );
    }

    /*
     * =========================================================
     * TẠO NHANH NHIỀU PHÒNG
     * LANDLORD + MANAGER
     * =========================================================
     */
    @PostMapping("/bulk")
    public ResponseEntity<?> createRoomsBulk(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {

        User currentUser =
                (User) authentication.getPrincipal();

        if (!isLandlord(currentUser) && !isManager(currentUser)) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền tạo phòng"
                    ));
        }

        Long buildingId =
                request.get("buildingId") == null
                        ? null
                        : ((Number) request.get("buildingId"))
                                .longValue();

        Integer startFloor =
                request.get("startFloor") == null
                        ? null
                        : ((Number) request.get("startFloor"))
                                .intValue();

        Integer floorCount =
                request.get("floorCount") == null
                        ? null
                        : ((Number) request.get("floorCount"))
                                .intValue();

        Integer roomsPerFloor =
                request.get("roomsPerFloor") == null
                        ? null
                        : ((Number) request.get("roomsPerFloor"))
                                .intValue();

        Double area =
                request.get("area") == null
                        ? null
                        : ((Number) request.get("area"))
                                .doubleValue();

        Long rent =
                request.get("rent") == null
                        ? null
                        : ((Number) request.get("rent"))
                                .longValue();

        Integer maxPeople =
                request.get("maxPeople") == null
                        ? null
                        : ((Number) request.get("maxPeople"))
                                .intValue();

        if (buildingId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Phải chọn tòa nhà"
                    ));
        }

        if (startFloor == null || startFloor <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tầng bắt đầu phải lớn hơn 0"
                    ));
        }

        if (floorCount == null || floorCount <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Số tầng tạo phải lớn hơn 0"
                    ));
        }

        if (roomsPerFloor == null || roomsPerFloor <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Số phòng mỗi tầng phải lớn hơn 0"
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

        Building building =
                buildingRepository
                        .findById(buildingId)
                        .orElse(null);

        if (building == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Không tìm thấy tòa nhà"
                    ));
        }

        if (!canManageBuilding(
                currentUser,
                building
        )) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền quản lý tòa nhà này"
                    ));
        }

        int endFloor =
                startFloor + floorCount - 1;

        if (startFloor > building.getFloors()
                || endFloor > building.getFloors()) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tầng tạo phòng vượt quá số tầng của tòa nhà"
                    ));
        }

        int totalRooms =
                floorCount * roomsPerFloor;

        if (totalRooms > 100) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Mỗi lần chỉ được tạo tối đa 100 phòng"
                    ));
        }

        List<Room> rooms =
                new ArrayList<>();

        for (
                int floor = startFloor;
                floor <= endFloor;
                floor++
        ) {

            for (
                    int roomNumber = 1;
                    roomNumber <= roomsPerFloor;
                    roomNumber++
            ) {

                String code =
                        String.valueOf(
                                floor * 100 + roomNumber
                        );

                if (roomRepository.existsByBuildingAndCode(
                        building,
                        code
                )) {

                    return ResponseEntity.badRequest()
                            .body(Map.of(
                                    "message",
                                    "Mã phòng "
                                            + code
                                            + " đã tồn tại trong tòa nhà"
                            ));
                }

                Room room =
                        new Room();

                room.setCode(code);
                room.setBuilding(building);
                room.setFloor(floor);
                room.setArea(area);
                room.setRent(rent);
                room.setMaxPeople(maxPeople);
                room.setStatus(Room.Status.EMPTY);

                rooms.add(room);
            }
        }

        roomRepository.saveAll(rooms);

        /*
         * Ghi audit cho từng phòng được tạo
         */
        for (Room room : rooms) {

            auditLogService.log(
                    currentUser,
                    "CREATE",
                    "ROOM",
                    room.getId(),
                    null,
                    Map.of(
                            "id", room.getId(),
                            "code", room.getCode(),
                            "buildingId", building.getId(),
                            "floor", room.getFloor(),
                            "area", room.getArea(),
                            "rent", room.getRent(),
                            "maxPeople", room.getMaxPeople(),
                            "status", room.getStatus().name()
                    )
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Tạo nhanh phòng thành công",
                        "createdCount",
                        rooms.size()
                )
        );
    }
}