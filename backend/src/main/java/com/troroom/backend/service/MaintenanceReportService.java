package com.troroom.backend.service;

import com.troroom.backend.dto.MaintenanceReportResponse;
import com.troroom.backend.entity.*;
import com.troroom.backend.repository.MaintenanceReportPhotoRepository;
import com.troroom.backend.repository.MaintenanceReportRepository;
import com.troroom.backend.repository.RentalContractRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class MaintenanceReportService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;
    private static final int MAX_PHOTOS = 3;
    private static final Path UPLOAD_DIR = Paths.get("uploads", "maintenance").toAbsolutePath().normalize();

    private final MaintenanceReportRepository reportRepository;
    private final MaintenanceReportPhotoRepository photoRepository;
    private final RentalContractRepository contractRepository;

    public MaintenanceReportService(MaintenanceReportRepository reportRepository,
                                    MaintenanceReportPhotoRepository photoRepository,
                                    RentalContractRepository contractRepository) {
        this.reportRepository = reportRepository;
        this.photoRepository = photoRepository;
        this.contractRepository = contractRepository;
    }

    @Transactional
    public MaintenanceReportResponse create(User tenant, String deviceType, String description,
                                            String urgencyText, List<MultipartFile> uploadedPhotos) {
        requireTenant(tenant);
        String normalizedDevice = requireText(deviceType, "Vui lòng nhập loại thiết bị.", 120);
        String normalizedDescription = requireText(description, "Vui lòng mô tả sự cố.", 3000);
        MaintenanceReport.Urgency urgency;
        try {
            urgency = MaintenanceReport.Urgency.valueOf(urgencyText == null ? "" : urgencyText.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mức độ chỉ được là NORMAL (Thường) hoặc URGENT (Gấp).");
        }

        LocalDate today = LocalDate.now(ZONE);
        RentalContract activeContract = contractRepository.findByTenantOrderByStartDateDesc(tenant).stream()
                .filter(c -> c.getStatus() == RentalContract.Status.ACTIVE)
                .filter(c -> c.getStartDate() != null && !c.getStartDate().isAfter(today))
                .filter(c -> c.getEndDate() != null && !c.getEndDate().isBefore(today))
                .filter(c -> !Boolean.TRUE.equals(c.getTerminated()))
                .filter(c -> c.getRoom() != null && c.getRoom().getStatus() == Room.Status.RENTED)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Bạn chỉ có thể báo hỏng khi đang thuê phòng theo hợp đồng còn hiệu lực."));

        List<MultipartFile> photos = uploadedPhotos == null ? List.of() : uploadedPhotos.stream()
                .filter(file -> file != null && !file.isEmpty()).toList();
        if (photos.size() > MAX_PHOTOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mỗi báo hỏng được đính kèm tối đa 3 ảnh.");
        }
        for (MultipartFile photo : photos) validatePhoto(photo);

        MaintenanceReport report = new MaintenanceReport();
        report.setReportCode(generateCode());
        report.setTenant(tenant);
        report.setContract(activeContract);
        report.setRoom(activeContract.getRoom());
        report.setDeviceType(normalizedDevice);
        report.setDescription(normalizedDescription);
        report.setUrgency(urgency);
        report.setStatus(MaintenanceReport.Status.NEW);
        report = reportRepository.save(report);

        try {
            Files.createDirectories(UPLOAD_DIR);
            for (MultipartFile photo : photos) {
                String extension = "image/png".equalsIgnoreCase(photo.getContentType()) ? ".png" : ".jpg";
                String storedName = UUID.randomUUID() + extension;
                Path destination = UPLOAD_DIR.resolve(storedName).normalize();
                if (!destination.startsWith(UPLOAD_DIR)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên tệp ảnh không hợp lệ.");
                }
                photo.transferTo(destination);
                MaintenanceReportPhoto entity = new MaintenanceReportPhoto();
                entity.setStoredFilename(storedName);
                entity.setOriginalFilename(safeOriginalName(photo.getOriginalFilename()));
                entity.setContentType(photo.getContentType());
                report.addPhoto(entity);
            }
            report = reportRepository.save(report);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu ảnh báo hỏng.", ex);
        }
        return MaintenanceReportResponse.from(report);
    }

    @Transactional
    public List<MaintenanceReportResponse> listMine(User tenant) {
        requireTenant(tenant);
        return reportRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId()).stream()
                .map(MaintenanceReportResponse::from).toList();
    }

    @Transactional
    public MaintenanceReport getMine(User tenant, Long reportId) {
        requireTenant(tenant);
        return reportRepository.findByIdAndTenantId(reportId, tenant.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy báo hỏng."));
    }

    @Transactional
    public MaintenanceReportResponse getMineResponse(User tenant, Long reportId) {
        return MaintenanceReportResponse.from(getMine(tenant, reportId));
    }

    @Transactional
    public MaintenanceReportPhoto getPhotoMine(User tenant, Long reportId, Long photoId) {
        getMine(tenant, reportId);
        return photoRepository.findByIdAndReportId(photoId, reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh báo hỏng."));
    }

    public Path photoPath(MaintenanceReportPhoto photo) {
        Path path = UPLOAD_DIR.resolve(photo.getStoredFilename()).normalize();
        if (!path.startsWith(UPLOAD_DIR)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh.");
        return path;
    }

    private void requireTenant(User tenant) {
        if (tenant == null || tenant.getRole() != User.Role.TENANT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chức năng này chỉ dành cho khách thuê.");
        }
    }

    private String requireText(String value, String message, int maxLength) {
        if (value == null || value.trim().isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        String normalized = value.trim();
        if (normalized.length() > maxLength) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nội dung vượt quá " + maxLength + " ký tự.");
        return normalized;
    }

    private void validatePhoto(MultipartFile photo) {
        if (photo.getSize() > MAX_PHOTO_BYTES) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mỗi ảnh không được vượt quá 5 MB.");
        String type = photo.getContentType();
        if (!"image/jpeg".equalsIgnoreCase(type) && !"image/png".equalsIgnoreCase(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ chấp nhận ảnh JPG/JPEG hoặc PNG.");
        }
        try (var input = photo.getInputStream()) {
            BufferedImage image = ImageIO.read(input);
            if (image == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tệp tải lên không phải ảnh hợp lệ.");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể đọc tệp ảnh.");
        }
    }

    private String safeOriginalName(String name) {
        if (name == null || name.isBlank()) return "anh-bao-hong";
        String base = Paths.get(name.replace('\\', '/')).getFileName().toString().replaceAll("[^a-zA-Z0-9._-]", "_");
        return base.length() > 255 ? base.substring(base.length() - 255) : base;
    }

    private String generateCode() {
        String month = YearMonth.now(ZONE).format(DateTimeFormatter.ofPattern("yyyyMM"));
        for (int attempt = 0; attempt < 100; attempt++) {
            String suffix = String.format(Locale.ROOT, "%04d", ThreadLocalRandom.current().nextInt(10000));
            String code = "BH-" + month + "-" + suffix;
            if (!reportRepository.existsByReportCode(code)) return code;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể tạo mã báo hỏng, vui lòng thử lại.");
    }
}
