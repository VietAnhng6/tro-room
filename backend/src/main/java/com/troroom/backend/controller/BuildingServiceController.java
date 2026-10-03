package com.troroom.backend.controller;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.BuildingService;
import com.troroom.backend.entity.Service;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.BuildingServiceRepository;
import com.troroom.backend.repository.ServiceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * S2-10: Cấu hình cách tính tiền điện nước cho từng toà nhà.
 */
@RestController
@RequestMapping("/api/buildings/{buildingId}/services")
public class BuildingServiceController {

    private final BuildingRepository buildingRepository;
    private final ServiceRepository serviceRepository;
    private final BuildingServiceRepository buildingServiceRepository;

    public BuildingServiceController(
            BuildingRepository buildingRepository,
            ServiceRepository serviceRepository,
            BuildingServiceRepository buildingServiceRepository
    ) {
        this.buildingRepository = buildingRepository;
        this.serviceRepository = serviceRepository;
        this.buildingServiceRepository = buildingServiceRepository;
    }

    /*
     * =========================================================
     * XEM CẤU HÌNH ĐIỆN NƯỚC CỦA MỘT TOÀ NHÀ
     * =========================================================
     */
    @GetMapping
    public ResponseEntity<?> getConfigs(
            Authentication authentication,
            @PathVariable Long buildingId
    ) {
        Building building = landlordBuilding(authentication, buildingId);
        if (building == null) {
            return buildingNotFound();
        }

        LocalDate today = LocalDate.now();
        List<BuildingService> configs =
                buildingServiceRepository
                        .findByBuildingOrderByEffectiveFromDesc(building);

        // Nhóm các phiên bản theo dịch vụ (đã sắp theo ngày áp dụng giảm dần).
        Map<Long, List<BuildingService>> grouped =
                new LinkedHashMap<>();

        for (BuildingService config : configs) {
            grouped.computeIfAbsent(
                            config.getService().getId(),
                            key -> new ArrayList<>()
                    )
                    .add(config);
        }

        List<Map<String, Object>> result = new ArrayList<>();

        for (List<BuildingService> versions : grouped.values()) {
            Service service = versions.get(0).getService();

            BuildingService current = null;
            BuildingService scheduled = null;

            for (BuildingService version : versions) {
                if (version.getEffectiveFrom().isAfter(today)) {
                    if (scheduled == null) {
                        scheduled = version;
                    }
                } else if (current == null) {
                    current = version;
                }
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("serviceId", service.getId());
            item.put("serviceName", service.getName());
            item.put("unit", service.getUnit());

            if (current != null) {
                item.put(
                        "calculationMethod",
                        current.getCalculationMethod().name()
                );
                item.put("price", current.getPrice());
                item.put(
                        "effectiveFrom",
                        current.getEffectiveFrom().toString()
                );
            } else {
                // Chưa có cấu hình hiệu lực -> hiển thị mặc định của dịch vụ.
                item.put(
                        "calculationMethod",
                        service.getCalculationMethod().name()
                );
                item.put("price", service.getPrice());
                item.put("effectiveFrom", null);
            }

            if (scheduled != null) {
                Map<String, Object> pending = new LinkedHashMap<>();
                pending.put(
                        "calculationMethod",
                        scheduled.getCalculationMethod().name()
                );
                pending.put("price", scheduled.getPrice());
                pending.put(
                        "effectiveFrom",
                        scheduled.getEffectiveFrom().toString()
                );
                item.put("scheduled", pending);
            } else {
                item.put("scheduled", null);
            }

            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    /*
     * =========================================================
     * CẬP NHẬT / THIẾT LẬP CẤU HÌNH ĐIỆN NƯỚC
     * =========================================================
     */
    @PutMapping("/{serviceId}")
    public ResponseEntity<?> updateConfig(
            Authentication authentication,
            @PathVariable Long buildingId,
            @PathVariable Long serviceId,
            @RequestBody Map<String, Object> request
    ) {
        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được cấu hình điện nước"
                    ));
        }

        Building building = buildingRepository.findById(buildingId)
                .orElse(null);

        if (building == null) {
            return ResponseEntity.notFound().build();
        }

        if (building.getLandlord() == null
                || !building.getLandlord().getId().equals(landlord.getId())) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền cấu hình toà nhà này"
                    ));
        }

        Service service = serviceRepository.findById(serviceId)
                .orElse(null);

        if (service == null) {
            return ResponseEntity.notFound().build();
        }

        String methodValue = (String) request.get("calculationMethod");
        Object priceObject = request.get("price");
        Object effectiveFromObject = request.get("effectiveFrom");

        if (methodValue == null || methodValue.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Cách tính không được để trống"
                    ));
        }

        Service.CalculationMethod method;

        try {
            method = Service.CalculationMethod.valueOf(
                    methodValue.trim().toUpperCase()
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Cách tính không hợp lệ"
                    ));
        }

        // S2-10: điện nước chỉ dùng cách tính theo đồng hồ hoặc theo đầu người.
        if (method != Service.CalculationMethod.BY_METER
                && method != Service.CalculationMethod.BY_PERSON) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Điện nước chỉ hỗ trợ tính theo chỉ số hoặc theo đầu người"
                    ));
        }

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

        // S2-10: không cho lưu thiếu đơn giá hoặc đơn giá bằng 0.
        if (price <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            method == Service.CalculationMethod.BY_METER
                                    ? "Đơn giá theo chỉ số phải lớn hơn 0"
                                    : "Số tiền một người một tháng phải lớn hơn 0"
                    ));
        }

        if (effectiveFromObject == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Kỳ bắt đầu áp dụng không được để trống"
                    ));
        }

        LocalDate effectiveFrom;

        try {
            effectiveFrom = LocalDate.parse(
                    effectiveFromObject.toString()
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Kỳ bắt đầu áp dụng không hợp lệ"
                    ));
        }

        if (effectiveFrom.isBefore(LocalDate.now())) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Kỳ bắt đầu áp dụng không được ở quá khứ"
                    ));
        }

        List<BuildingService> existing =
                buildingServiceRepository
                        .findByBuildingAndServiceOrderByEffectiveFromDesc(
                                building,
                                service
                        );

        boolean duplicateDate = existing.stream()
                .anyMatch(config ->
                        config.getEffectiveFrom().equals(effectiveFrom)
                );

        if (duplicateDate) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Dịch vụ đã có cấu hình áp dụng từ ngày này"
                    ));
        }

        BuildingService config = new BuildingService();
        config.setBuilding(building);
        config.setService(service);
        config.setCalculationMethod(method);
        config.setPrice(price);
        config.setEffectiveFrom(effectiveFrom);

        buildingServiceRepository.save(config);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Lưu cấu hình điện nước thành công",
                        "serviceId", service.getId(),
                        "calculationMethod", method.name(),
                        "price", price,
                        "effectiveFrom", effectiveFrom.toString()
                )
        );
    }

    /*
     * =========================================================
     * LỊCH SỬ CẤU HÌNH CỦA MỘT DỊCH VỤ TRONG TOÀ NHÀ
     * =========================================================
     */
    @GetMapping("/{serviceId}/history")
    public ResponseEntity<?> getHistory(
            Authentication authentication,
            @PathVariable Long buildingId,
            @PathVariable Long serviceId
    ) {
        Building building = landlordBuilding(authentication, buildingId);
        if (building == null) {
            return buildingNotFound();
        }

        Service service = serviceRepository.findById(serviceId)
                .orElse(null);

        if (service == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                buildingServiceRepository
                        .findByBuildingAndServiceOrderByEffectiveFromDesc(
                                building,
                                service
                        )
                        .stream()
                        .map(config -> Map.of(
                                "id", config.getId(),
                                "calculationMethod",
                                config.getCalculationMethod().name(),
                                "price", config.getPrice(),
                                "effectiveFrom",
                                config.getEffectiveFrom().toString()
                        ))
                        .toList()
        );
    }

    /*
     * Kiểm tra chủ trọ có sở hữu toà nhà không.
     */
    private Building landlordBuilding(
            Authentication authentication,
            Long buildingId
    ) {
        User user = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(user.getRole().name())
                && !"MANAGER".equals(user.getRole().name())) {
            return null;
        }

        Building building = buildingRepository.findById(buildingId)
                .orElse(null);

        if (building == null) {
            return null;
        }

        boolean isLandlord = "LANDLORD".equals(user.getRole().name())
                && building.getLandlord() != null
                && building.getLandlord().getId().equals(user.getId());

        boolean isManager = "MANAGER".equals(user.getRole().name())
                && building.getManager() != null
                && building.getManager().getId().equals(user.getId());

        return (isLandlord || isManager) ? building : null;
    }

    private ResponseEntity<?> buildingNotFound() {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền xem toà nhà này"
                ));
    }
}
