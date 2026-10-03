package com.troroom.backend.repository;

import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

/** Truy vấn yêu cầu thuê dành cho Chủ nhà (S2-07, S2-08). */
public interface LandlordRequestRepository extends JpaRepository<RentalRequest, Long> {

    @Query("select r from RentalRequest r "
            + "join fetch r.listing l join fetch l.room rm join fetch rm.building b join fetch r.tenant t "
            + "where b.landlord = :landlord order by r.createdAt desc")
    List<RentalRequest> findAllForLandlord(@Param("landlord") User landlord);

    long countByListing_Room_Building_LandlordAndStatus(User landlord, RentalRequest.Status status);
}