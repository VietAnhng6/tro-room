package com.troroom.backend.controller;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.User;
import com.troroom.backend.entity.Room;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.UserRepository;
import com.troroom.backend.repository.RoomRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/buildings")
public class BuildingController {

    private final BuildingRepository buildingRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    public BuildingController(
            BuildingRepository buildingRepository,
            UserRepository userRepository,
            RoomRepository roomRepository
    ) {
        this.buildingRepository = buildingRepository;
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
    }

    /*
     * =========================================================
     * TẠO TÒA NHÀ
     * Chỉ LANDLORD được tạo
     * =========================================================
     */
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
        String district = (String) request.get("district");

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

        Building building = new Building();

        building.setName(name.trim());
        building.setAddress(address.trim());
        building.setDistrict(
                district == null || district.isBlank()
                        ? null
                        : district.trim()
        );
        building.setFloors(floors);
        building.setLandlord(landlord);
        building.setManager(manager);
        building.setNote(note);
        building.setActive(true);

        buildingRepository.save(building);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Tạo tòa nhà thành công",
                        "buildingId",
                        building.getId()
                )
        );
    }

    /*
     * =========================================================
     * SỬA TÒA NHÀ
     *
     * LANDLORD:
     * - Sửa tòa nhà của mình
     * - Có thể thay Manager
     *
     * MANAGER:
     * - Chỉ sửa tòa nhà được giao cho mình
     * - Không được thay Manager
     * =========================================================
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateBuilding(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {

        User currentUser = (User) authentication.getPrincipal();

        boolean isLandlord =
                "LANDLORD".equals(currentUser.getRole().name());

        boolean isManager =
                "MANAGER".equals(currentUser.getRole().name());

        if (!isLandlord && !isManager) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền sửa tòa nhà"
                    ));
        }

        Building building = buildingRepository.findById(id)
                .orElse(null);

        if (building == null) {
            return ResponseEntity.notFound().build();
        }

        boolean canEdit = false;

        if (isLandlord) {

            canEdit =
                    building.getLandlord() != null
                    && building.getLandlord()
                            .getId()
                            .equals(currentUser.getId());

        } else if (isManager) {

            canEdit =
                    building.getManager() != null
                    && building.getManager()
                            .getId()
                            .equals(currentUser.getId());
        }

        if (!canEdit) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền sửa tòa nhà này"
                    ));
        }

        String name = (String) request.get("name");
        String address = (String) request.get("address");
        String district = (String) request.get("district");

        Integer floors = request.get("floors") == null
                ? null
                : ((Number) request.get("floors")).intValue();

        String note = (String) request.get("note");

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

        /*
         * Chỉ LANDLORD được thay đổi Manager.
         */
        if (isLandlord) {

            Long managerId = request.get("managerId") == null
                    ? null
                    : ((Number) request.get("managerId")).longValue();

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

            building.setManager(manager);
        }

                building.setName(name.trim());
        building.setAddress(address.trim());
        building.setDistrict(
                district == null || district.isBlank()
                        ? null
                        : district.trim()
        );
        building.setFloors(floors);
        building.setNote(note);

        buildingRepository.save(building);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Cập nhật tòa nhà thành công"
                )
        );
    }

    /*
     * =========================================================
     * NGỪNG HOẠT ĐỘNG TÒA NHÀ
     * Chỉ LANDLORD được thực hiện
     * =========================================================
     */
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

        if (building.getLandlord() == null
                || !building.getLandlord()
                        .getId()
                        .equals(landlord.getId())) {

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
    /*
 * =========================================================
 * HOẠT ĐỘNG LẠI TÒA NHÀ
 * Chỉ LANDLORD được thực hiện
 * =========================================================
 */
@PutMapping("/{id}/activate")
public ResponseEntity<?> activateBuilding(
        Authentication authentication,
        @PathVariable Long id
) {

    User landlord = (User) authentication.getPrincipal();

    if (!"LANDLORD".equals(landlord.getRole().name())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Chỉ chủ trọ mới được hoạt động lại tòa nhà"
                ));
    }

    Building building = buildingRepository.findById(id)
            .orElse(null);

    if (building == null) {
        return ResponseEntity.notFound().build();
    }

    if (building.getLandlord() == null
            || !building.getLandlord()
                    .getId()
                    .equals(landlord.getId())) {

        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền hoạt động lại tòa nhà này"
                ));
    }

    building.setActive(true);

    buildingRepository.save(building);

    return ResponseEntity.ok(
            Map.of(
                    "message",
                    "Đã hoạt động lại tòa nhà"
            )
    );
}
    /*
     * =========================================================
     * XEM DANH SÁCH TÒA NHÀ
     *
     * LANDLORD:
     * - Xem tòa nhà mình sở hữu
     *
     * MANAGER:
     * - Chỉ xem tòa nhà được giao cho mình
     * =========================================================
     */
    @GetMapping
    public ResponseEntity<?> getBuildings(
            Authentication authentication,
            @RequestParam(required = false) String search
    ) {

        User currentUser = (User) authentication.getPrincipal();

        boolean isLandlord =
                "LANDLORD".equals(currentUser.getRole().name());

        boolean isManager =
                "MANAGER".equals(currentUser.getRole().name());

        if (!isLandlord && !isManager) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền xem danh sách tòa nhà"
                    ));
        }

        List<Building> buildings;

        /*
         * LANDLORD
         */
        if (isLandlord) {

            if (search != null && !search.isBlank()) {

                buildings = buildingRepository
                        .findByLandlordAndNameContainingIgnoreCaseOrLandlordAndAddressContainingIgnoreCase(
                                currentUser,
                                search.trim(),
                                currentUser,
                                search.trim()
                        );

            } else {

                buildings =
                        buildingRepository.findByLandlord(currentUser);
            }

        } else {

            /*
             * MANAGER:
             * Chỉ xem tòa nhà được giao cho mình.
             */
            buildings = buildingRepository.findAll()
                    .stream()
                    .filter(building ->
                            building.getManager() != null
                            && building.getManager()
                                    .getId()
                                    .equals(currentUser.getId())
                    )
                    .filter(building -> {

                        if (search == null || search.isBlank()) {
                            return true;
                        }

                        String keyword =
                                search.trim().toLowerCase();

                        return
                                building.getName()
                                        .toLowerCase()
                                        .contains(keyword)
                                ||
                                building.getAddress()
                                        .toLowerCase()
                                        .contains(keyword);
                    })
                    .toList();
        }

        /*
         * Chuyển dữ liệu sang response
         */
        List<Map<String, Object>> result =
                buildings.stream()
                        .map(building -> {

                            long roomCount =
                                    roomRepository.countByBuilding(
                                            building
                                    );

                            long vacantCount =
                                    roomRepository
                                            .countByBuildingAndStatus(
                                                    building,
                                                    Room.Status.EMPTY
                                            );

                            Map<String, Object> item =
                                    new HashMap<>();

                            item.put(
                                    "id",
                                    building.getId()
                            );

                            item.put(
                                    "name",
                                    building.getName()
                            );

                            item.put(
                                    "address",
                                    building.getAddress()
                            );

                            item.put(
                                "district",
                                building.getDistrict()
                                );
                            item.put(
                                    "floors",
                                    building.getFloors()
                            );

                            item.put(
                                    "managerId",
                                    building.getManager() == null
                                            ? null
                                            : building.getManager()
                                                    .getId()
                            );

                            item.put(
                                    "managerName",
                                    building.getManager() == null
                                            ? null
                                            : building.getManager()
                                                    .getName()
                            );

                            item.put(
                                    "note",
                                    building.getNote() == null
                                            ? ""
                                            : building.getNote()
                            );

                            item.put(
                                    "active",
                                    building.isActive()
                            );

                            item.put(
                                    "roomCount",
                                    roomCount
                            );

                            item.put(
                                    "vacantCount",
                                    vacantCount
                            );

                            return item;
                        })
                        .toList();

        return ResponseEntity.ok(result);
    }
}