package com.troroom.backend.controller;

import com.troroom.backend.dto.ServiceResponse;
import com.troroom.backend.entity.Service;
import com.troroom.backend.entity.ServicePriceHistory;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ServiceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.troroom.backend.repository.ServicePriceHistoryRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
public class ServiceController {

    private final ServiceRepository serviceRepository;
    private final ServicePriceHistoryRepository priceHistoryRepository;

   public ServiceController(
        ServiceRepository serviceRepository,
        ServicePriceHistoryRepository priceHistoryRepository
) {
    this.serviceRepository = serviceRepository;
    this.priceHistoryRepository = priceHistoryRepository;
}

    // GET: xem danh sách dịch vụ
    @GetMapping
    public ResponseEntity<?> getServices(
            Authentication authentication,
            @RequestParam(required = false) Boolean active
    ) {
        User currentUser = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(currentUser.getRole().name())
        && !"MANAGER".equals(currentUser.getRole().name())) {

    return ResponseEntity.status(403)
            .body(Map.of(
                    "message",
                    "Bạn không có quyền xem dịch vụ"
            ));
        }

        List<Service> services;

        if (active != null) {
            services = serviceRepository.findByActive(active);
        } else {
            services = serviceRepository.findAll();
        }

        return ResponseEntity.ok(
                services.stream()
                        .map(service -> new ServiceResponse(
                                service.getId(),
                                service.getName(),
                                service.getCalculationMethod(),
                                service.getUnit(),
                                service.getPrice(),
                                service.getDescription(),
                                service.isActive()
                        ))
                        .toList()
        );
    }

    // POST: tạo dịch vụ
    @PostMapping
    public ResponseEntity<?> createService(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {
        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được tạo dịch vụ"
                    ));
        }

        String name = (String) request.get("name");
        String unit = (String) request.get("unit");
        String calculationMethodValue =
                (String) request.get("calculationMethod");

        Object priceObject = request.get("price");
        String description = (String) request.get("description");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tên dịch vụ không được để trống"
                    ));
        }

        if (calculationMethodValue == null
                || calculationMethodValue.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Cách tính không được để trống"
                    ));
        }

        Service.CalculationMethod calculationMethod;

        try {
            calculationMethod =
                    Service.CalculationMethod.valueOf(
                            calculationMethodValue.toUpperCase()
                    );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Cách tính dịch vụ không hợp lệ"
                    ));
        }

        if (unit == null || unit.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Đơn vị không được để trống"
                    ));
        }

        if (priceObject == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Giá dịch vụ không được để trống"
                    ));
        }

        long price;

        try {
            price = Long.parseLong(priceObject.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Giá dịch vụ không hợp lệ"
                    ));
        }

        if (price < 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Giá dịch vụ không được âm"
                    ));
        }

        if (serviceRepository.existsByNameIgnoreCase(name.trim())) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Dịch vụ này đã tồn tại"
                    ));
        }

        Service service = new Service();

        service.setName(name.trim());
        service.setCalculationMethod(calculationMethod);
        service.setUnit(unit.trim());
        service.setPrice(price);
        service.setDescription(description);
        service.setActive(true);

        Service saved = serviceRepository.save(service);

        ServiceResponse response = new ServiceResponse(
                saved.getId(),
                saved.getName(),
                saved.getCalculationMethod(),
                saved.getUnit(),
                saved.getPrice(),
                saved.getDescription(),
                saved.isActive()
        );

        return ResponseEntity.ok(response);
    }

    // PUT: cập nhật dịch vụ
    @PutMapping("/{id}")
    public ResponseEntity<?> updateService(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được cập nhật dịch vụ"
                    ));
        }

        Service service =
                serviceRepository.findById(id).orElse(null);

        if (service == null) {
            return ResponseEntity.notFound().build();
        }

        if (request.containsKey("name")) {
            String name = (String) request.get("name");

            if (name == null || name.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Tên dịch vụ không được để trống"
                        ));
            }

            service.setName(name.trim());
        }

        if (request.containsKey("calculationMethod")) {
            String calculationMethodValue =
                    (String) request.get("calculationMethod");

            if (calculationMethodValue == null
                    || calculationMethodValue.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Cách tính không được để trống"
                        ));
            }

            try {
                Service.CalculationMethod calculationMethod =
                        Service.CalculationMethod.valueOf(
                                calculationMethodValue.toUpperCase()
                        );

                service.setCalculationMethod(calculationMethod);

            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Cách tính dịch vụ không hợp lệ"
                        ));
            }
        }

        if (request.containsKey("unit")) {
            String unit = (String) request.get("unit");

            if (unit == null || unit.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Đơn vị không được để trống"
                        ));
            }

            service.setUnit(unit.trim());
        }

        if (request.containsKey("price")) {
            long price;

            try {
                price = Long.parseLong(
                        request.get("price").toString()
                );
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Giá dịch vụ không hợp lệ"
                        ));
            }

            if (price < 0) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Giá dịch vụ không được âm"
                        ));
            }

            service.setPrice(price);
        }

        if (request.containsKey("description")) {
            service.setDescription(
                    (String) request.get("description")
            );
        }

        Service saved = serviceRepository.save(service);

        ServiceResponse response = new ServiceResponse(
                saved.getId(),
                saved.getName(),
                saved.getCalculationMethod(),
                saved.getUnit(),
                saved.getPrice(),
                saved.getDescription(),
                saved.isActive()
        );

        return ResponseEntity.ok(response);
    }

    // PUT: bật/tắt dịch vụ
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateServiceStatus(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được đổi trạng thái dịch vụ"
                    ));
        }

        Service service =
                serviceRepository.findById(id).orElse(null);

        if (service == null) {
            return ResponseEntity.notFound().build();
        }

        Object activeObject = request.get("active");

        if (activeObject == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Trạng thái active không được để trống"
                    ));
        }

        String activeValue = activeObject.toString();

        if (!activeValue.equalsIgnoreCase("true")
                && !activeValue.equalsIgnoreCase("false")) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Trạng thái active không hợp lệ"
                    ));
        }

        boolean active =
                Boolean.parseBoolean(activeValue);

        service.setActive(active);
        serviceRepository.save(service);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Cập nhật trạng thái dịch vụ thành công",
                        "active",
                        active
                )
        );
    }
    @GetMapping("/{id}/price-history")
public ResponseEntity<?> getPriceHistory(
        Authentication authentication,
        @PathVariable Long id
) {
    User landlord = (User) authentication.getPrincipal();

    if (!"LANDLORD".equals(landlord.getRole().name())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Chỉ chủ trọ mới được xem lịch sử giá"
                ));
    }

    Service service =
            serviceRepository.findById(id).orElse(null);

    if (service == null) {
        return ResponseEntity.notFound().build();
    }

    return ResponseEntity.ok(
            priceHistoryRepository
                    .findByServiceOrderByEffectiveFromDesc(service)
                    .stream()
                    .map(history -> Map.of(
                            "id", history.getId(),
                            "price", history.getPrice(),
                            "effectiveFrom",
                            history.getEffectiveFrom()
                    ))
                    .toList()
    );
}
@PutMapping("/{id}/price")
public ResponseEntity<?> updateServicePrice(
        Authentication authentication,
        @PathVariable Long id,
        @RequestBody Map<String, Object> request
) {
    User landlord = (User) authentication.getPrincipal();

    if (!"LANDLORD".equals(landlord.getRole().name())) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Chỉ chủ trọ mới được thay đổi giá dịch vụ"
                ));
    }

    Service service =
            serviceRepository.findById(id).orElse(null);

    if (service == null) {
        return ResponseEntity.notFound().build();
    }

    Object priceObject = request.get("price");
    Object effectiveFromObject = request.get("effectiveFrom");

    if (priceObject == null || effectiveFromObject == null) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Giá và ngày bắt đầu áp dụng không được để trống"
                ));
    }

    long price;

    try {
        price = Long.parseLong(priceObject.toString());
    } catch (NumberFormatException e) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Giá dịch vụ không hợp lệ"
                ));
    }

    if (price < 0) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Giá dịch vụ không được âm"
                ));
    }

    LocalDate effectiveFrom;

    try {
        effectiveFrom =
                LocalDate.parse(effectiveFromObject.toString());
    } catch (Exception e) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Ngày bắt đầu áp dụng không hợp lệ"
                ));
    }
    if (effectiveFrom.isBefore(LocalDate.now())) {
    return ResponseEntity.badRequest()
            .body(Map.of(
                    "message",
                    "Ngày bắt đầu áp dụng không được ở quá khứ"
            ));
    }   
    List<ServicePriceHistory> existingHistory =
        priceHistoryRepository
                .findByServiceOrderByEffectiveFromDesc(service);

    boolean sameEffectiveDate = existingHistory.stream()
        .anyMatch(history ->
                history.getEffectiveFrom().equals(effectiveFrom)
        );

    if (sameEffectiveDate) {
    return ResponseEntity.badRequest()
            .body(Map.of(
                    "message",
                    "Dịch vụ đã có mức giá áp dụng từ ngày này"
            ));
    }

    ServicePriceHistory history = new ServicePriceHistory();

    history.setService(service);
    history.setPrice(price);
    history.setEffectiveFrom(effectiveFrom);

    priceHistoryRepository.save(history);

    service.setPrice(price);
    serviceRepository.save(service);

    return ResponseEntity.ok(
            Map.of(
                    "message",
                    "Cập nhật giá dịch vụ thành công",
                    "price",
                    price,
                    "effectiveFrom",
                    effectiveFrom
            )
    );
    }
}