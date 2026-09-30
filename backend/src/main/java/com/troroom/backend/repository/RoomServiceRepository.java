package com.troroom.backend.repository;

import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.RoomService;
import com.troroom.backend.entity.Service;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomServiceRepository extends JpaRepository<RoomService, Long> {

    List<RoomService> findByRoom(Room room);

    Optional<RoomService> findByRoomAndService(
            Room room,
            Service service
    );

    boolean existsByRoomAndService(
            Room room,
            Service service
    );
}