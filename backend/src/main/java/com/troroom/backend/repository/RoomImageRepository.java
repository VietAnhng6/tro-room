package com.troroom.backend.repository;

import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.RoomImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomImageRepository extends JpaRepository<RoomImage, Long> {

    List<RoomImage> findByRoomOrderBySortOrderAsc(Room room);

    long countByRoom(Room room);
}