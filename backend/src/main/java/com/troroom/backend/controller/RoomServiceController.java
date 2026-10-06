package com.troroom.backend.controller;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.RoomService;
import com.troroom.backend.entity.Service;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.repository.RoomServiceRepository;
import com.troroom.backend.repository.ServiceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/room-services")
public class RoomServiceController {

    private final RoomServiceRepository roomServiceRepository;
    private final RoomRepository roomRepository;
    private final ServiceRepository serviceRepository;
    private final BuildingRepository buildingRepository;

    public RoomServiceController(
            RoomServiceRepository roomServiceRepository,
            RoomRepository roomRepository,
            ServiceRepository serviceRepository,
            BuildingRepository buildingRepository
    ) {
        this.roomServiceRepository = roomServiceRepository;
        this.roomRepository = roomRepository;
        this.serviceRepository = serviceRepository;
        this.buildingRepository = buildingRepository;
    }

    private boolean isAdmin(User user) {
        return "ADMIN".equals(user.getRole().name());
    }

    private boolean isLandlord(User user) {
        return "LANDLORD".equals(user.getRole().name());
    }

    private boolean isManager(User user) {
        return "MANAGER".equals(user.getRole().name());
    }

    private boolean canManageRoom(User user, Room room) {
        if (isAdmin(user)) {
            return true;
        }

        Building building = room.getBuilding();

        if (building == null) {
            return false;
        }

        if (isLandlord(user)) {
            return building.getLandlord() != null
                    && building.getLandlord().getId().equals(user.getId());
        }

        if (isManager(user)) {
            return building.getManager() != null
                    && building.getManager().getId().equals(user.getId());
        }

        return false;
    }

    // GET: xem danh sách dịch vụ của phòng
    @GetMapping("/room/{roomId}")
    public ResponseEntity<?> getRoomServices(
            Authentication authentication,
            @PathVariable Long roomId
    ) {
        User currentUser = (User) authentication.getPrincipal();

        Room room = roomRepository.findById(roomId).orElse(null);

        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canManageRoom(currentUser, room)) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền xem dịch vụ của phòng này"
                    ));
        }

        List<RoomService> roomServices =
                roomServiceRepository.findByRoom(room);

        return ResponseEntity.ok(
                roomServices.stream()
                        .map(roomService -> Map.of(
                                "id", roomService.getId(),
                                "roomId", room.getId(),
                                "serviceId", roomService.getService().getId(),
                                "serviceName", roomService.getService().getName(),
                                "calculationMethod",
                                roomService.getService()
                                        .getCalculationMethod()
                                        .name(),
                                "unit", roomService.getService().getUnit(),
                                "price", roomService.getPrice(),
                                "active", roomService.getService().isActive()
                        ))
                        .toList()
        );
    }

    // POST: gán dịch vụ cho phòng
    @PostMapping("/room/{roomId}")
    public ResponseEntity<?> addRoomService(
            Authentication authentication,
            @PathVariable Long roomId,
            @RequestBody Map<String, Object> request
    ) {
        User currentUser = (User) authentication.getPrincipal();

        Room room = roomRepository.findById(roomId).orElse(null);

        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canManageRoom(currentUser, room)) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền gán dịch vụ cho phòng này"
                    ));
        }

        Object serviceIdObject = request.get("serviceId");
        Object priceObject = request.get("price");

        if (serviceIdObject == null || priceObject == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Mã dịch vụ và đơn giá không được để trống"
                    ));
        }

        Long serviceId;

        try {
            serviceId = Long.parseLong(serviceIdObject.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Mã dịch vụ không hợp lệ"
                    ));
        }

        Service service =
                serviceRepository.findById(serviceId).orElse(null);

        if (service == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Dịch vụ không tồn tại"
                    ));
        }

        if (!service.isActive()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Không thể gán dịch vụ đang ngừng hoạt động"
                    ));
        }

        if (roomServiceRepository.existsByRoomAndService(room, service)) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Phòng đã được gán dịch vụ này"
                    ));
        }

        long price;

        try {
            price = Long.parseLong(priceObject.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Đơn giá không hợp lệ"
                    ));
        }

        if (price < 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Đơn giá không được âm"
                    ));
        }

        RoomService roomService = new RoomService();

        roomService.setRoom(room);
        roomService.setService(service);
        roomService.setPrice(price);

        RoomService saved =
                roomServiceRepository.save(roomService);

        return ResponseEntity.ok(
                Map.of(
                        "id", saved.getId(),
                        "roomId", room.getId(),
                        "serviceId", service.getId(),
                        "serviceName", service.getName(),
                        "price", saved.getPrice()
                )
        );
    }

    // PUT: thay đổi đơn giá riêng của phòng
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRoomService(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        User currentUser = (User) authentication.getPrincipal();

        RoomService roomService =
                roomServiceRepository.findById(id).orElse(null);

        if (roomService == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canManageRoom(currentUser, roomService.getRoom())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền cập nhật dịch vụ của phòng này"
                    ));
        }

        Object priceObject = request.get("price");

        if (priceObject == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Đơn giá không được để trống"
                    ));
        }

        long price;

        try {
            price = Long.parseLong(priceObject.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Đơn giá không hợp lệ"
                    ));
        }

        if (price < 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Đơn giá không được âm"
                    ));
        }

        roomService.setPrice(price);

        RoomService saved =
                roomServiceRepository.save(roomService);

        return ResponseEntity.ok(
                Map.of(
                        "id", saved.getId(),
                        "roomId", saved.getRoom().getId(),
                        "serviceId", saved.getService().getId(),
                        "serviceName", saved.getService().getName(),
                        "price", saved.getPrice()
                )
        );
    }

    // DELETE: bỏ dịch vụ khỏi phòng
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoomService(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User currentUser = (User) authentication.getPrincipal();

        RoomService roomService =
                roomServiceRepository.findById(id).orElse(null);

        if (roomService == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canManageRoom(currentUser, roomService.getRoom())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền xóa dịch vụ của phòng này"
                    ));
        }

        roomServiceRepository.delete(roomService);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Đã bỏ dịch vụ khỏi phòng"
                )
        );
    }
}