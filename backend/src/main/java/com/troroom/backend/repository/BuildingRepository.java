package com.troroom.backend.repository;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BuildingRepository extends JpaRepository<Building, Long> {

    List<Building> findByLandlord(User landlord);

    List<Building> findByLandlordAndNameContainingIgnoreCase(
            User landlord,
            String name
    );

    List<Building> findByManager(User manager);

    List<Building> findByActive(boolean active);
}