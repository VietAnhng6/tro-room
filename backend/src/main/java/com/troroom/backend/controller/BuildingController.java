package com.troroom.backend.controller;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.UserRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/buildings")
public class BuildingController {

    private final BuildingRepository buildingRepository;
    private final UserRepository userRepository;

    public BuildingController(
            BuildingRepository buildingRepository,
            UserRepository userRepository
    ) {
        this.buildingRepository = buildingRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<?> createBuilding(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {

        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được tạo tòa nhà"
                    ));
        }

        String name = (String) request.get("name");
        String address = (String) request.get("address");
        Integer floors = (Integer) request.get("floors");
        String note = (String) request.get("note");
        Long managerId = request.get("managerId") == null
                ? null
                : ((Number) request.get("managerId")).longValue();

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Tên tòa nhà không được để trống"));
        }

        if (address == null || address.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Địa chỉ không được để trống"));
        }

        if (floors == null || floors <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Số tầng phải lớn hơn 0"));
        }

        User manager = null;

        if (managerId != null) {
            manager = userRepository.findById(managerId)
                    .orElse(null);

            if (manager == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Không tìm thấy quản lý"));
            }

            if (!"MANAGER".equals(manager.getRole().name())) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Tài khoản được gán phải có vai trò MANAGER"
                        ));
            }
        }

        Building building = new Building();

        building.setName(name.trim());
        building.setAddress(address.trim());
        building.setFloors(floors);
        building.setLandlord(landlord);
        building.setManager(manager);
        building.setNote(note);
        building.setActive(true);

        buildingRepository.save(building);

        return ResponseEntity.ok(
                Map.of(
                        "message", "Tạo tòa nhà thành công",
                        "buildingId", building.getId()
                )
        );
    }
    @PutMapping("/{id}")
public ResponseEntity<?> updateBuilding(
        Authentication authentication,
        @PathVariable Long id,
        @RequestBody Map<String, Object> request
) {

    User landlord = (User) authentication.getPrincipal();

    if (!"LANDLORD".equals(landlord.getRole().name())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Chỉ chủ trọ mới được sửa tòa nhà"
                ));
    }

    Building building = buildingRepository.findById(id)
            .orElse(null);

    if (building == null) {
        return ResponseEntity.notFound().build();
    }

    // Không cho Landlord sửa tòa nhà của người khác
    if (!building.getLandlord().getId().equals(landlord.getId())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền sửa tòa nhà này"
                ));
    }

    String name = (String) request.get("name");
    String address = (String) request.get("address");
    Integer floors = request.get("floors") == null
            ? null
            : ((Number) request.get("floors")).intValue();
    String note = (String) request.get("note");

    Long managerId = request.get("managerId") == null
            ? null
            : ((Number) request.get("managerId")).longValue();

    if (name == null || name.isBlank()) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Tên tòa nhà không được để trống"
                ));
    }

    if (address == null || address.isBlank()) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Địa chỉ không được để trống"
                ));
    }

    if (floors == null || floors <= 0) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Số tầng phải lớn hơn 0"
                ));
    }

    User manager = null;

    if (managerId != null) {

        manager = userRepository.findById(managerId)
                .orElse(null);

        if (manager == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Không tìm thấy quản lý"
                    ));
        }

        if (!"MANAGER".equals(manager.getRole().name())) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tài khoản được gán phải có vai trò MANAGER"
                    ));
        }
    }

    building.setName(name.trim());
    building.setAddress(address.trim());
    building.setFloors(floors);
    building.setManager(manager);
    building.setNote(note);

    buildingRepository.save(building);

    return ResponseEntity.ok(
            Map.of(
                    "message",
                    "Cập nhật tòa nhà thành công"
            )
    );
}
@PutMapping("/{id}/deactivate")
public ResponseEntity<?> deactivateBuilding(
        Authentication authentication,
        @PathVariable Long id
) {

    User landlord = (User) authentication.getPrincipal();

    if (!"LANDLORD".equals(landlord.getRole().name())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Chỉ chủ trọ mới được ngừng hoạt động tòa nhà"
                ));
    }

    Building building = buildingRepository.findById(id)
            .orElse(null);

    if (building == null) {
        return ResponseEntity.notFound().build();
    }

    if (!building.getLandlord().getId().equals(landlord.getId())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền ngừng hoạt động tòa nhà này"
                ));
    }

    building.setActive(false);

    buildingRepository.save(building);

    return ResponseEntity.ok(
            Map.of(
                    "message",
                    "Đã ngừng hoạt động tòa nhà"
            )
    );
}
    @GetMapping
    public ResponseEntity<?> getBuildings(
            Authentication authentication,
            @RequestParam(required = false) String search
    ) {

        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được xem danh sách tòa nhà"
                    ));
        }

        List<Building> buildings;

if (search != null && !search.isBlank()) {
    buildings = buildingRepository
            .findByLandlordAndNameContainingIgnoreCase(
                    landlord,
                    search
            );
} else {
    buildings = buildingRepository.findByLandlord(landlord);
}

return ResponseEntity.ok(buildings);
    }
}