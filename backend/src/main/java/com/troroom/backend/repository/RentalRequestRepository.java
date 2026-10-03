package com.troroom.backend.repository;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RentalRequestRepository extends JpaRepository<RentalRequest, Long> {

    Optional<RentalRequest> findFirstByListingAndTenantAndStatusOrderByCreatedAtDesc(
            Listing listing,
            User tenant,
            RentalRequest.Status status
    );

    boolean existsByRequestCode(String requestCode);

    List<RentalRequest> findByTenantOrderByCreatedAtDesc(User tenant);
}
