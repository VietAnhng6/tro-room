package com.troroom.backend.controller;

import com.troroom.backend.dto.MaintenanceReportResponse;
import com.troroom.backend.entity.MaintenanceReport;
import com.troroom.backend.entity.MaintenanceReportPhoto;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.MaintenanceReportService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.util.List;

@RestController
@RequestMapping("/api/maintenance-reports")
public class MaintenanceReportController {
    private final MaintenanceReportService service;

    public MaintenanceReportController(MaintenanceReportService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MaintenanceReportResponse> create(
            Authentication authentication,
            @RequestParam String deviceType,
            @RequestParam String description,
            @RequestParam String urgency,
            @RequestParam(name = "photos", required = false) List<MultipartFile> photos) {
        return ResponseEntity.status(201).body(service.create(currentTenant(authentication), deviceType, description, urgency, photos));
    }

    @GetMapping
    public ResponseEntity<List<MaintenanceReportResponse>> listMine(Authentication authentication) {
        return ResponseEntity.ok(service.listMine(currentTenant(authentication)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceReportResponse> getMine(Authentication authentication, @PathVariable Long id) {
        return ResponseEntity.ok(service.getMineResponse(currentTenant(authentication), id));
    }

    @GetMapping("/{id}/photos/{photoId}")
    public ResponseEntity<Resource> getPhoto(Authentication authentication, @PathVariable Long id, @PathVariable Long photoId) {
        MaintenanceReportPhoto photo = service.getPhotoMine(currentTenant(authentication), id, photoId);
        var path = service.photoPath(photo);
        if (!Files.exists(path)) throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy tệp ảnh.");
        try {
            MediaType mediaType = MediaType.parseMediaType(photo.getContentType());
            return ResponseEntity.ok().contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + photo.getOriginalFilename().replace("\"", "") + "\"")
                    .body(new FileSystemResource(path));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Định dạng ảnh không hợp lệ.");
        }
    }

    private User currentTenant(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập.");
        }
        if (user.getRole() != User.Role.TENANT) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Chức năng này chỉ dành cho khách thuê.");
        }
        return user;
    }
}
