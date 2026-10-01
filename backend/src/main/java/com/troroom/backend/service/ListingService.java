package com.troroom.backend.service;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.Room;
import com.troroom.backend.repository.ListingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ListingService {

    private final ListingRepository listingRepository;

    public ListingService(ListingRepository listingRepository) {
        this.listingRepository = listingRepository;
    }

    public Listing createListing(
            Room room,
            String title,
            String description
    ) {
        if (room.getStatus() != Room.Status.EMPTY) {
            throw new IllegalStateException(
                    "Chỉ có thể tạo tin cho phòng đang trống"
            );
        }

        if (listingRepository.existsByRoomAndStatus(
                room,
                Listing.Status.PUBLISHED
        )) {
            throw new IllegalStateException(
                    "Phòng này đã có tin đăng đang hiển thị"
            );
        }

        Listing listing = new Listing();

        listing.setRoom(room);
        listing.setTitle(title);
        listing.setDescription(description);
        listing.setStatus(Listing.Status.PUBLISHED);
        listing.setCreatedAt(LocalDateTime.now());
        listing.setExpiresAt(
                LocalDateTime.now().plusDays(30)
        );

        return listingRepository.save(listing);
    }

    public List<Listing> getAllListings() {
        return listingRepository.findAll();
    }

    public Listing getListing(Long id) {
        return listingRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy tin đăng"
                        )
                );
    }

    public Listing updateListing(
            Long id,
            String title,
            String description
    ) {
        Listing listing = getListing(id);

        listing.setTitle(title);
        listing.setDescription(description);

        return listingRepository.save(listing);
    }

    public void hideListing(Long id) {
        Listing listing = getListing(id);

        listing.setStatus(Listing.Status.HIDDEN);

        listingRepository.save(listing);
    }
}