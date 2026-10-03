package com.troroom.backend.repository;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.BuildingService;
import com.troroom.backend.entity.Service;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BuildingServiceRepository
        extends JpaRepository<BuildingService, Long> {

    List<BuildingService> findByBuildingOrderByEffectiveFromDesc(
            Building building
    );

    List<BuildingService> findByBuildingAndServiceOrderByEffectiveFromDesc(
            Building building,
            Service service
    );

    Optional<BuildingService>
            findFirstByBuildingAndServiceOrderByEffectiveFromDesc(
                    Building building,
                    Service service
            );
}
