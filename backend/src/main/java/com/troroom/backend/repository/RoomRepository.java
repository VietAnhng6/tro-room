package com.troroom.backend.repository;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByBuilding(Building building);

    List<Room> findByBuildingAndFloor(
            Building building,
            int floor
    );

    Optional<Room> findByBuildingAndCode(
            Building building,
            String code
    );

    boolean existsByBuildingAndCode(
            Building building,
            String code
    );

    long countByBuilding(Building building);
}