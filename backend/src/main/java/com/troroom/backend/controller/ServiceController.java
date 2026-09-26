package com.troroom.backend.controller;

import com.troroom.backend.entity.Service;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ServiceRepository;
import com.troroom.backend.dto.ServiceResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
public class ServiceController {

    private final ServiceRepository serviceRepository;

    public ServiceController(ServiceRepository serviceRepository) {
        this.serviceRepository = serviceRepository;
    }

    // GET: xem danh sách dịch vụ
    @GetMapping
    public ResponseEntity<?> getServices(
            Authentication authentication,
            @RequestParam(required = false) Boolean active
    ) {
        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được xem dịch vụ"
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
        Object priceObject = request.get("price");
        String description = (String) request.get("description");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tên dịch vụ không được để trống"
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
        service.setPrice(price);
        service.setDescription(description);
        service.setActive(true);

        Service saved = serviceRepository.save(service);

    ServiceResponse response = new ServiceResponse(
        saved.getId(),
        saved.getName(),
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

        Service service = serviceRepository.findById(id).orElse(null);

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

        Service service = serviceRepository.findById(id).orElse(null);

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

        boolean active;

        try {
            active = Boolean.parseBoolean(
                    activeObject.toString()
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Trạng thái active không hợp lệ"
                    ));
        }

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
}