package com.troroom.backend.repository;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface Roomrepository extends JpaRepository<Room, Long> {

    List<Room> findByBuilding(Building building);

    List<Room> findByBuildingOrderByFloorAscRoomCodeAsc(Building building);

    Optional<Room> findByBuildingAndRoomCodeIgnoreCase(Building building, String roomCode);

    long countByBuilding(Building building);

    long countByBuildingAndStatus(Building building, Room.Status status);

    boolean existsByBuilding(Building building);
}