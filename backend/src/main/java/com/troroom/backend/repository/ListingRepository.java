package com.troroom.backend.repository;

import com.troroom.backend.entity.Listing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ListingRepository
        extends JpaRepository<Listing, Long>,
                JpaSpecificationExecutor<Listing> {

    java.util.List<Listing> findAllByRoom(com.troroom.backend.entity.Room room);

    Optional<Listing> findByRoomAndStatus(
            com.troroom.backend.entity.Room room,
            Listing.Status status
    );

    boolean existsByRoomAndStatus(
            com.troroom.backend.entity.Room room,
            Listing.Status status
    );
}