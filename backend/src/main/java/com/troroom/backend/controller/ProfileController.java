package com.troroom.backend.controller;

import com.troroom.backend.entity.TenantProfile;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.TenantProfileRepository;
import com.troroom.backend.repository.UserRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;
    private final TenantProfileRepository profileRepository;

    private final Path uploadDir = Paths.get("uploads/profile");

    public ProfileController(
            UserRepository userRepository,
            TenantProfileRepository profileRepository
    ) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
    }

    @GetMapping
    public ResponseEntity<?> getProfile(Authentication authentication) {

        User user = (User) authentication.getPrincipal();

        TenantProfile profile = profileRepository
                .findByUser(user)
                .orElse(null);

        if (profile == null) {
            return ResponseEntity.ok(Map.of());
        }

        String citizenId = profile.getCitizenId();

        if (citizenId != null
                && citizenId.length() > 4
                && !user.getRole().name().equals("ADMIN")) {

            citizenId = "********"
                    + citizenId.substring(citizenId.length() - 4);
        }

        return ResponseEntity.ok(Map.of(
                "dateOfBirth", profile.getDateOfBirth(),
                "citizenId", citizenId,
                "hometown", profile.getHometown(),
                "job", profile.getJob(),
                "idFrontUrl", profile.getIdFrontUrl() == null ? "" : profile.getIdFrontUrl(),
                "idBackUrl", profile.getIdBackUrl() == null ? "" : profile.getIdBackUrl()
        ));
    }

    @GetMapping("/admin/{userId}")
    public ResponseEntity<?> getTenantProfileForAdmin(
            Authentication authentication,
            @PathVariable Long userId) {

        User admin = (User) authentication.getPrincipal();

        if (!"ADMIN".equals(admin.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Bạn không có quyền xem hồ sơ này"));
        }

        TenantProfile profile = profileRepository
                .findByUserId(userId)
                .orElse(null);

        if (profile == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of(
                "dateOfBirth", profile.getDateOfBirth(),
                "citizenId", profile.getCitizenId(),
                "hometown", profile.getHometown(),
                "job", profile.getJob(),
                "idFrontUrl", profile.getIdFrontUrl() == null ? "" : profile.getIdFrontUrl(),
                "idBackUrl", profile.getIdBackUrl() == null ? "" : profile.getIdBackUrl()
        ));
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> saveProfile(
            Authentication authentication,

            @RequestParam String dateOfBirth,
            @RequestParam String citizenId,
            @RequestParam String hometown,
            @RequestParam String job,

            @RequestParam(required = false) MultipartFile idFront,
            @RequestParam(required = false) MultipartFile idBack
    ) throws IOException {

        if (!citizenId.matches("\\d{9}|\\d{12}")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "CCCD phải gồm 9 hoặc 12 chữ số"));
        }

        User user = (User) authentication.getPrincipal();

        Files.createDirectories(uploadDir);

        TenantProfile profile = profileRepository
                .findByUser(user)
                .orElseGet(() -> {
                    TenantProfile newProfile = new TenantProfile();
                    newProfile.setUser(user);
                    return newProfile;
                });

        profile.setDateOfBirth(dateOfBirth);
        profile.setCitizenId(citizenId);
        profile.setHometown(hometown);
        profile.setJob(job);

        if (idFront != null && !idFront.isEmpty()) {
            profile.setIdFrontUrl(saveImage(idFront, "front"));
        }

        if (idBack != null && !idBack.isEmpty()) {
            profile.setIdBackUrl(saveImage(idBack, "back"));
        }

        profileRepository.save(profile);

        return ResponseEntity.ok(
                Map.of("message", "Thông tin hồ sơ đã được lưu")
        );
    }

    private String saveImage(MultipartFile file, String type)
        throws IOException {

    String contentType = file.getContentType();

    if (!"image/jpeg".equals(contentType)
            && !"image/png".equals(contentType)) {
        throw new IllegalArgumentException(
                "Ảnh phải có định dạng JPG hoặc PNG"
        );
    }

    if (file.getSize() > 5 * 1024 * 1024) {
        throw new IllegalArgumentException(
                "Ảnh không được vượt quá 5MB"
        );
    }

    BufferedImage originalImage =
            ImageIO.read(file.getInputStream());

    if (originalImage == null) {
        throw new IllegalArgumentException(
                "Không thể đọc ảnh"
        );
    }

    int originalWidth = originalImage.getWidth();
    int originalHeight = originalImage.getHeight();

    int newWidth = originalWidth;
    int newHeight = originalHeight;

    // Nếu ảnh rộng hơn 1600px thì resize
    if (originalWidth > 1600) {
        newWidth = 1600;
        newHeight =
                (int) Math.round(
                        (double) originalHeight
                                * newWidth
                                / originalWidth
                );
    }

    BufferedImage resizedImage =
            new BufferedImage(
                    newWidth,
                    newHeight,
                    BufferedImage.TYPE_INT_RGB
            );

    Graphics2D graphics =
            resizedImage.createGraphics();

    graphics.drawImage(
            originalImage.getScaledInstance(
                    newWidth,
                    newHeight,
                    Image.SCALE_SMOOTH
            ),
            0,
            0,
            null
    );

    graphics.dispose();

    String extension =
            "image/png".equals(contentType)
                    ? ".png"
                    : ".jpg";

    String filename =
            System.currentTimeMillis()
                    + "_" + type + extension;

    Path target = uploadDir.resolve(filename);

    String format =
            "image/png".equals(contentType)
                    ? "png"
                    : "jpg";

    ImageIO.write(
            resizedImage,
            format,
            target.toFile()
    );
        return target.toString();
    }
}