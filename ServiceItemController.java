package com.troroom.backend.controller;

import com.troroom.backend.entity.Serviceitem;
import com.troroom.backend.entity.ServicePrice;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.Serviceitemrepository;
import com.troroom.backend.repository.Servicepricerepository;
import com.troroom.backend.service.ActivityLogService;
import com.troroom.backend.service.ServiceItemService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
public class ServiceItemController {

    private final Serviceitemrepository serviceItemRepository;
    private final Servicepricerepository servicePriceRepository;
    private final ServiceItemService serviceItemService;
    private final ActivityLogService activityLogService;

    public ServiceItemController(
            Serviceitemrepository serviceItemRepository,
            Servicepricerepository servicePriceRepository,
            ServiceItemService serviceItemService,
            ActivityLogService activityLogService
    ) {
        this.serviceItemRepository = serviceItemRepository;
        this.servicePriceRepository = servicePriceRepository;
        this.serviceItemService = serviceItemService;
        this.activityLogService = activityLogService;
    }

    @GetMapping
    public ResponseEntity<?> getServices(Authentication authentication) {

        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Chỉ chủ trọ mới được xem danh sách dịch vụ"));
        }

        List<Serviceitem> items = serviceItemRepository.findByLandlord(landlord);

        List<Map<String, Object>> response = items.stream()
                .map(serviceItemService::toResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createService(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {
        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Chỉ chủ trọ mới được khai báo dịch vụ"));
        }

        String name = (String) request.get("name");
        String calcMethodStr = (String) request.get("calcMethod");
        String unit = (String) request.get("unit");
        Long unitPrice = request.get("unitPrice") == null ? null : ((Number) request.get("unitPrice")).longValue();

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên dịch vụ không được để trống"));
        }

        if (serviceItemRepository.existsByLandlordAndNameIgnoreCase(landlord, name.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Dịch vụ này đã tồn tại"));
        }

        Serviceitem.CalcMethod calcMethod;
        try {
            calcMethod = Serviceitem.CalcMethod.valueOf(calcMethodStr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cách tính tiền không hợp lệ"));
        }

        if (unit == null || unit.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Đơn vị tính không được để trống"));
        }

        if (unitPrice == null || unitPrice <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Đơn giá phải lớn hơn 0"));
        }

        Serviceitem item = new Serviceitem();
        item.setName(name.trim());
        item.setCalcMethod(calcMethod);
        item.setUnit(unit.trim());
        item.setLandlord(landlord);
        item.setActive(true);
        item.setDefault(false);

        serviceItemRepository.save(item);

        ServicePrice price = new ServicePrice();
        price.setServiceItem(item);
        price.setUnitPrice(unitPrice);
        price.setEffectiveFrom(LocalDate.now());
        servicePriceRepository.save(price);

        activityLogService.log(
                landlord, "CREATE", "ServiceItem", String.valueOf(item.getId()),
                "Tạo dịch vụ " + item.getName() + ", đơn giá " + unitPrice
        );

        return ResponseEntity.ok(Map.of("message", "Tạo dịch vụ thành công", "serviceId", item.getId()));
    }

    // Đổi đơn giá: luôn tạo bản ghi mới kèm ngày hiệu lực, không sửa đè giá cũ
    // (S1-09 AC 3: hoá đơn đã phát hành trước ngày đó giữ nguyên đơn giá cũ).
    @PutMapping("/{id}/price")
    public ResponseEntity<?> changePrice(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        User landlord = (User) authentication.getPrincipal();

        Serviceitem item = serviceItemRepository.findById(id).orElse(null);

        if (item == null) {
            return ResponseEntity.notFound().build();
        }

        if (!item.getLandlord().getId().equals(landlord.getId())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Bạn không có quyền sửa dịch vụ này"));
        }

        Long unitPrice = request.get("unitPrice") == null ? null : ((Number) request.get("unitPrice")).longValue();
        String effectiveFromStr = (String) request.get("effectiveFrom");

        if (unitPrice == null || unitPrice <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Đơn giá phải lớn hơn 0"));
        }

        LocalDate effectiveFrom;
        try {
            effectiveFrom = effectiveFromStr == null ? LocalDate.now() : LocalDate.parse(effectiveFromStr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ngày hiệu lực không hợp lệ"));
        }

        if (effectiveFrom.isBefore(LocalDate.now())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Ngày hiệu lực không được ở quá khứ"));
        }

        ServicePrice oldPrice = serviceItemService.getCurrentPrice(item);

        ServicePrice newPrice = new ServicePrice();
        newPrice.setServiceItem(item);
        newPrice.setUnitPrice(unitPrice);
        newPrice.setEffectiveFrom(effectiveFrom);
        servicePriceRepository.save(newPrice);

        activityLogService.log(
                landlord, "UPDATE", "ServiceItem", String.valueOf(item.getId()),
                "Đổi đơn giá " + item.getName() + ": "
                        + (oldPrice == null ? "chưa có" : oldPrice.getUnitPrice())
                        + " -> " + unitPrice + " (hiệu lực từ " + effectiveFrom + ")"
        );

        return ResponseEntity.ok(Map.of(
                "message", "Đã cập nhật đơn giá, áp dụng từ " + effectiveFrom
        ));
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<?> deactivate(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User landlord = (User) authentication.getPrincipal();

        Serviceitem item = serviceItemRepository.findById(id).orElse(null);

        if (item == null) {
            return ResponseEntity.notFound().build();
        }

        if (!item.getLandlord().getId().equals(landlord.getId())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Bạn không có quyền sửa dịch vụ này"));
        }

        item.setActive(false);
        serviceItemRepository.save(item);

        activityLogService.log(
                landlord, "DEACTIVATE", "ServiceItem", String.valueOf(item.getId()),
                "Ngừng áp dụng dịch vụ " + item.getName()
        );

        return ResponseEntity.ok(Map.of("message", "Đã ngừng áp dụng dịch vụ"));
    }
}