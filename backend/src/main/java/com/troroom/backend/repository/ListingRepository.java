package com.troroom.backend.repository;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.Room;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ListingRepository extends JpaRepository<Listing, Long> {

    List<Listing> findByRoom(Room room);

    boolean existsByRoomAndStatus(Room room, Listing.ListingStatus status);
}
