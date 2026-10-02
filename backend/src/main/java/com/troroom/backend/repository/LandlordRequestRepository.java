package com.troroom.backend.repository;

import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** Truy vấn yêu cầu thuê dành cho Chủ nhà (S2-07, S2-08). */
public interface LandlordRequestRepository extends JpaRepository<RentalRequest, Long> {

    @Query("select r from RentalRequest r "
            + "join fetch r.listing l join fetch l.room rm join fetch rm.building b join fetch r.tenant t "
            + "where b.landlord = :landlord order by r.createdAt desc")
    List<RentalRequest> findAllForLandlord(@Param("landlord") User landlord);

    long countByListing_Room_Building_LandlordAndStatus(User landlord, RentalRequest.Status status);

    /** S2-08: tìm 1 yêu cầu theo id, chỉ khi nó thuộc toà nhà của Chủ nhà này. */
    @Query("select r from RentalRequest r "
            + "join fetch r.listing l join fetch l.room rm join fetch rm.building b join fetch r.tenant t "
            + "where r.id = :id and b.landlord = :landlord")
    Optional<RentalRequest> findByIdForLandlord(@Param("id") Long id, @Param("landlord") User landlord);

    /** S2-08: đếm lịch hẹn khác của cùng phòng nằm trong khoảng (from, to), loại trừ yêu cầu đang xử lý. */
    @Query("select count(r) from RentalRequest r "
            + "where r.listing.room.id = :roomId and r.status = :status and r.id <> :excludeId "
            + "and r.scheduledAt > :from and r.scheduledAt < :to")
    long countScheduleConflicts(@Param("roomId") Long roomId,
                                @Param("status") RentalRequest.Status status,
                                @Param("excludeId") Long excludeId,
                                @Param("from") LocalDateTime from,
                                @Param("to") LocalDateTime to);
}