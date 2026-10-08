package com.troroom.backend.repository;

import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RentalContractRepository extends JpaRepository<RentalContract, Long> {

    Optional<RentalContract> findByRequestId(Long requestId);

    List<RentalContract> findByTenantOrderByStartDateDesc(User tenant);

    List<RentalContract> findByRoomOrderByStartDateDesc(Room room);

    boolean existsByRoomAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
            Room room,
            java.time.LocalDate startDate,
            java.time.LocalDate endDate
    );
    boolean existsByContractCode(String contractCode);
}