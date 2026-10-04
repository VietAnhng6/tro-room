package com.troroom.backend.controller;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.RoomImage;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RoomImageRepository;
import com.troroom.backend.repository.RoomRepository;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.troroom.backend.dto.RoomImageOrderRequest;
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
@RequestMapping("/api/room-images")
public class RoomImageController {

    private final RoomImageRepository roomImageRepository;
    private final RoomRepository roomRepository;

    private final Path uploadDir = Paths.get("uploads/rooms");

    public RoomImageController(
            RoomImageRepository roomImageRepository,
            RoomRepository roomRepository
    ) {
        this.roomImageRepository = roomImageRepository;
        this.roomRepository = roomRepository;
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

    @PostMapping(
            value = "/room/{roomId}",
            consumes = "multipart/form-data"
    )
    public ResponseEntity<?> uploadImage(
            Authentication authentication,
            @PathVariable Long roomId,
            @RequestParam("image") MultipartFile image
    ) throws IOException {

        User currentUser = (User) authentication.getPrincipal();

        Room room = roomRepository.findById(roomId).orElse(null);

        if (room == null) {
            return ResponseEntity.notFound().build();
        }

        if (!canManageRoom(currentUser, room)) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền quản lý ảnh của phòng này"
                    ));
        }

        long imageCount = roomImageRepository.countByRoom(room);

        if (imageCount >= 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Mỗi phòng chỉ được tối đa 8 ảnh"
                    ));
        }

        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Ảnh không được để trống"
                    ));
        }

        String contentType = image.getContentType();
        String originalFilename = image.getOriginalFilename();
        boolean isPng = (contentType != null && (contentType.equalsIgnoreCase("image/png") || contentType.equalsIgnoreCase("image/x-png")))
                || (originalFilename != null && originalFilename.toLowerCase().endsWith(".png"));
        boolean isJpg = (contentType != null && (contentType.equalsIgnoreCase("image/jpeg") || contentType.equalsIgnoreCase("image/jpg") || contentType.equalsIgnoreCase("image/pjpeg")))
                || (originalFilename != null && (originalFilename.toLowerCase().endsWith(".jpg") || originalFilename.toLowerCase().endsWith(".jpeg")));

        if (!isPng && !isJpg) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Ảnh phải có định dạng JPG hoặc PNG"
                    ));
        }

        if (image.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Ảnh không được vượt quá 5MB"
                    ));
        }

        Files.createDirectories(uploadDir);

        BufferedImage originalImage =
                ImageIO.read(image.getInputStream());

        if (originalImage == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Không thể đọc định dạng ảnh"
                    ));
        }

        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();

        int newWidth = originalWidth;
        int newHeight = originalHeight;

        if (originalWidth > 1600) {
            newWidth = 1600;
            newHeight = (int) Math.round(
                    (double) originalHeight
                            * newWidth
                            / originalWidth
            );
        }

        int imageType = isPng ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage resizedImage =
                new BufferedImage(
                        newWidth,
                        newHeight,
                        imageType
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

        String extension = isPng ? ".png" : ".jpg";

        String filename =
                System.currentTimeMillis()
                        + "_" + roomId
                        + "_" + (imageCount + 1)
                        + extension;

        Path target = uploadDir.resolve(filename);

        String format = isPng ? "png" : "jpg";

        ImageIO.write(
                resizedImage,
                format,
                target.toFile()
        );

        RoomImage roomImage = new RoomImage();

        roomImage.setRoom(room);
        roomImage.setImageUrl(target.toString());
        roomImage.setSortOrder((int) imageCount + 1);

        RoomImage saved =
                roomImageRepository.save(roomImage);

        return ResponseEntity.ok(
                Map.of(
                        "id", saved.getId(),
                        "roomId", room.getId(),
                        "imageUrl", "/api/room-images/" + saved.getId(),
                        "sortOrder", saved.getSortOrder()
                )
        );
    }
    @GetMapping("/room/{roomId}")
public ResponseEntity<?> getRoomImages(
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
                        "Bạn không có quyền xem ảnh của phòng này"
                ));
    }

    return ResponseEntity.ok(
            roomImageRepository
                    .findByRoomOrderBySortOrderAsc(room)
                    .stream()
                    .map(roomImage -> Map.of(
                            "id", roomImage.getId(),
                            "roomId", room.getId(),
                            "imageUrl", "/api/room-images/" + roomImage.getId(),
                            "sortOrder", roomImage.getSortOrder()
                    ))
                    .toList()
    );
}
@GetMapping("/{id}")
public ResponseEntity<?> getImage(
        @PathVariable Long id
) throws IOException {

    RoomImage roomImage = roomImageRepository.findById(id).orElse(null);

    if (roomImage == null) {
        return ResponseEntity.notFound().build();
    }

    Path path = Paths.get(roomImage.getImageUrl());

    if (!Files.exists(path)) {
        return ResponseEntity.notFound().build();
    }

    byte[] data = Files.readAllBytes(path);

    String contentType = Files.probeContentType(path);

    if (contentType == null) {
        contentType = "application/octet-stream";
    }

    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType)
            .body(new ByteArrayResource(data));
}
@DeleteMapping("/{id}")
public ResponseEntity<?> deleteImage(
        Authentication authentication,
        @PathVariable Long id
) throws IOException {

    User currentUser = (User) authentication.getPrincipal();

    RoomImage roomImage = roomImageRepository.findById(id).orElse(null);

    if (roomImage == null) {
        return ResponseEntity.notFound().build();
    }

    Room room = roomImage.getRoom();

    if (!canManageRoom(currentUser, room)) {
        return ResponseEntity.status(403)
                .body(Map.of(
                        "message",
                        "Bạn không có quyền xóa ảnh của phòng này"
                ));
    }

    Path path = Paths.get(roomImage.getImageUrl());

    if (Files.exists(path)) {
        Files.delete(path);
    }

    roomImageRepository.delete(roomImage);

    return ResponseEntity.ok(
            Map.of("message", "Xóa ảnh thành công")
    );
}
    @PutMapping("/room/{roomId}/order")
public ResponseEntity<?> reorderImages(
        Authentication authentication,
        @PathVariable Long roomId,
        @RequestBody RoomImageOrderRequest request
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
                        "Bạn không có quyền sắp xếp ảnh của phòng này"
                ));
    }

    if (request.getImageIds() == null
            || request.getImageIds().isEmpty()) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Danh sách ảnh không được để trống"
                ));
    }

    var images = roomImageRepository
            .findByRoomOrderBySortOrderAsc(room);

    if (request.getImageIds().size() != images.size()) {
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "message",
                        "Phải gửi đầy đủ danh sách ảnh của phòng"
                ));
    }

    for (int i = 0; i < request.getImageIds().size(); i++) {

        Long imageId = request.getImageIds().get(i);

        RoomImage image = images.stream()
                .filter(item -> item.getId().equals(imageId))
                .findFirst()
                .orElse(null);

        if (image == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Có ảnh không thuộc phòng này"
                    ));
        }

        image.setSortOrder(i + 1);
    }

    roomImageRepository.saveAll(images);

    return ResponseEntity.ok(
            Map.of("message", "Sắp xếp ảnh thành công")
    );
    }
}