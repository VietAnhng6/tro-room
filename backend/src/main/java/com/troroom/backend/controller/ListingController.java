package com.troroom.backend.controller;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.dto.VacantRoomListingResponse;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.service.ListingService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/listings")
public class ListingController {

    private final ListingService listingService;
    private final RoomRepository roomRepository;

    public ListingController(
            ListingService listingService,
            RoomRepository roomRepository
    ) {
        this.listingService = listingService;
        this.roomRepository = roomRepository;
    }

    /**
     * S4-05: dashboard chủ nhà liệt kê phòng trống chưa có tin đang hiển thị.
     * Các phòng vừa checkout sẽ có draftListingId để có thể đăng lại ngay.
     */
    @GetMapping("/vacant-without-published")
    public ResponseEntity<List<VacantRoomListingResponse>> getVacantRoomsWithoutPublished(
            Authentication authentication
    ) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(listingService.getVacantRoomsWithoutPublishedListing(user));
    }

    /** S4-05: một thao tác chuyển tin nháp thành tin công khai. */
    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishDraft(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User user = currentUser(authentication);
        Listing listing = listingService.publishDraft(user, id);
        return ResponseEntity.ok(Map.of(
                "message", "Đăng tin thành công",
                "listingId", listing.getId(),
                "status", listing.getStatus().name(),
                "roomId", listing.getRoom().getId(),
                "currentRent", listing.getRoom().getRent(),
                "expiresAt", listing.getExpiresAt().toString()
        ));
    }

    private User currentUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập lại");
    }

    @PostMapping
    public ResponseEntity<?> createListing(
            @RequestBody Map<String, Object> request
    ) {

        Long roomId = Long.valueOf(
                request.get("roomId").toString()
        );

        String title = request.get("title").toString();

        String description =
                request.get("description") != null
                        ? request.get("description").toString()
                        : "";

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy phòng"
                        )
                );

        Listing listing = listingService.createListing(
                room,
                title,
                description
        );

        return ResponseEntity.ok(listing);
    }
}