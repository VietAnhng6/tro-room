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

public interface RentalContractRepository
        extends JpaRepository<RentalContract, Long> {

    Optional<RentalContract> findByRequestId(Long requestId);

    List<RentalContract> findByTenantOrderByStartDateDesc(User tenant);

    List<RentalContract> findByRoomOrderByStartDateDesc(Room room);

    List<RentalContract>
    findByRoom_Building_Landlord_IdOrderByStartDateDesc(Long landlordId);

    List<RentalContract>
    findByRoom_Building_Manager_IdOrderByStartDateDesc(Long managerId);

    boolean existsByRoomAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
            Room room,
            LocalDate startDate,
            LocalDate endDate
    );

    boolean existsByContractCode(String contractCode);

    /**
     * S3-05: Lấy hợp đồng có hiệu lực trong kỳ ghi công tơ.
     */
    @Query("select c from RentalContract c "
            + "join fetch c.room r join fetch c.tenant "
            + "where r.building.id = :buildingId "
            + "and r.status = com.troroom.backend.entity.Room.Status.RENTED "
            + "and c.status = com.troroom.backend.entity.RentalContract.Status.ACTIVE "
            + "and c.startDate <= :end and c.endDate >= :start "
            + "order by r.floor asc, r.code asc")
    List<RentalContract> findActiveForMeter(
            @Param("buildingId") Long buildingId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("""
            select c from RentalContract c
            join fetch c.room r
            join fetch r.building b
            where b.id in :buildingIds
              and c.startDate <= :rangeEnd
              and c.endDate >= :rangeStart
            """)
    List<RentalContract> findForMonthlyOccupancy(
            @Param("buildingIds") List<Long> buildingIds,
            @Param("rangeStart") LocalDate rangeStart,
            @Param("rangeEnd") LocalDate rangeEnd
    );

    /**
     * S3-09: Kiểm tra thời gian gia hạn có trùng hợp đồng khác
     * của cùng phòng hay không.
     */
    @Query("""
            SELECT CASE
                WHEN COUNT(c) > 0 THEN TRUE
                ELSE FALSE
            END
            FROM RentalContract c
            WHERE c.room = :room
              AND c.id <> :contractId
              AND c.endDate >= :startDate
              AND c.startDate <= :endDate
            """)
    boolean existsOverlappingContractExcludingCurrent(
            @Param("room") Room room,
            @Param("contractId") Long contractId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
