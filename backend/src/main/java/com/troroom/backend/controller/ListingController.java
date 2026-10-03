package com.troroom.backend.controller;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.service.AuditLogService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/listings")
public class ListingController {

    private final ListingRepository listingRepository;
    private final RoomRepository roomRepository;
    private final AuditLogService auditLogService;

    public ListingController(
            ListingRepository listingRepository,
            RoomRepository roomRepository,
            AuditLogService auditLogService
    ) {
        this.listingRepository = listingRepository;
        this.roomRepository = roomRepository;
        this.auditLogService = auditLogService;
    }

    /*
     * =========================================================
     * TẠO TIN ĐĂNG TỪ PHÒNG TRỐNG
     * Chỉ LANDLORD, phòng phải ở trạng thái Trống
     * =========================================================
     */
    @PostMapping
    public ResponseEntity<?> createListing(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {

        User currentUser = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(currentUser.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được đăng tin"
                    ));
        }

        Long roomId = request.get("roomId") == null
                ? null
                : ((Number) request.get("roomId")).longValue();

        String title = (String) request.get("title");
        String description = (String) request.get("description");

        if (roomId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Phải chọn phòng"
                    ));
        }

        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tiêu đề tin đăng không được để trống"
                    ));
        }

        Room room = roomRepository.findById(roomId).orElse(null);

        if (room == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Không tìm thấy phòng"
                    ));
        }

        if (room.getBuilding().getLandlord() == null
                || !room.getBuilding().getLandlord().getId()
                        .equals(currentUser.getId())) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền đăng tin cho phòng này"
                    ));
        }

        if (room.getStatus() != Room.Status.EMPTY) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Chỉ phòng đang trống mới được đăng tin"
                    ));
        }

        if (listingRepository.existsByRoomAndStatus(
                room,
                Listing.ListingStatus.VISIBLE
        )) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Phòng đã có tin đăng đang hiển thị"
                    ));
        }

        Listing listing = new Listing();

        listing.setTitle(title.trim());
        listing.setDescription(
                description == null ? null : description.trim()
        );
        listing.setRoom(room);
        listing.setStatus(Listing.ListingStatus.VISIBLE);
        listing.setExpiresAt(LocalDate.now().plusDays(30));
        listing.setCreatedAt(LocalDateTime.now());

        listingRepository.save(listing);

        auditLogService.log(
                currentUser,
                "CREATE",
                "LISTING",
                listing.getId(),
                null,
                Map.of(
                        "id", listing.getId(),
                        "title", listing.getTitle(),
                        "roomId", room.getId(),
                        "status", listing.getStatus().name(),
                        "expiresAt", listing.getExpiresAt().toString()
                )
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Đăng tin thành công",
                        "listingId",
                        listing.getId()
                )
        );
    }

    /*
     * =========================================================
     * XEM CHI TIẾT TIN ĐĂNG
     * Mọi vai trò đã đăng nhập đều xem được
     * =========================================================
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getListing(@PathVariable Long id) {

        Listing listing = listingRepository.findById(id).orElse(null);

        if (listing == null) {
            return ResponseEntity.notFound().build();
        }

        Room room = listing.getRoom();

        return ResponseEntity.ok(
                Map.of(
                        "id", listing.getId(),
                        "title", listing.getTitle(),
                        "description",
                                listing.getDescription() == null
                                        ? ""
                                        : listing.getDescription(),
                        "status", listing.getStatus().name(),
                        "expiresAt",
                                listing.getExpiresAt().toString(),
                        "room", Map.of(
                                "id", room.getId(),
                                "code", room.getCode(),
                                "floor", room.getFloor(),
                                "area", room.getArea(),
                                "rent", room.getRent(),
                                "maxPeople", room.getMaxPeople()
                        ),
                        "building", Map.of(
                                "id", room.getBuilding().getId(),
                                "name", room.getBuilding().getName(),
                                "address", room.getBuilding().getAddress()
                        )
                )
        );
    }
}
