package com.troroom.backend.repository;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ListingRepository extends JpaRepository<Listing, Long> {

    Optional<Listing> findByRoomAndStatus(
            Room room,
            Listing.Status status
    );

    boolean existsByRoomAndStatus(
            Room room,
            Listing.Status status
    );
}
