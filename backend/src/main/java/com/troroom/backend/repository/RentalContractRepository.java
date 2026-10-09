package com.troroom.backend.repository;

import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

import java.util.List;
import java.util.Optional;

public interface RentalContractRepository extends JpaRepository<RentalContract, Long> {

    Optional<RentalContract> findByRequestId(Long requestId);

    List<RentalContract> findByTenantOrderByStartDateDesc(User tenant);

    List<RentalContract> findByRoomOrderByStartDateDesc(Room room);
    List<RentalContract> findByRoom_Building_Landlord_IdOrderByStartDateDesc(Long landlordId);
    boolean existsByRoomAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
            Room room,
            java.time.LocalDate startDate,
            java.time.LocalDate endDate
    );
    boolean existsByContractCode(String contractCode);

    /**
     * S3-05: hợp đồng của các phòng đang thuê trong một toà nhà, có hiệu lực
     * trong khoảng [start, end] của kỳ ghi, xếp theo tầng rồi mã phòng.
     */
    @Query("select c from RentalContract c "
            + "join fetch c.room r join fetch c.tenant "
            + "where r.building.id = :buildingId "
            + "and r.status = com.troroom.backend.entity.Room.Status.RENTED "
            + "and c.startDate <= :end and c.endDate >= :start "
            + "order by r.floor asc, r.code asc")
    List<RentalContract> findActiveForMeter(
            @Param("buildingId") Long buildingId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
