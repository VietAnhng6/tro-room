package com.troroom.backend.controller;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.Room;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.service.ListingService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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