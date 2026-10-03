package com.troroom.backend.repository;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface RentalRequestRepository
        extends JpaRepository<RentalRequest, Long> {

    List<RentalRequest> findByTenantOrderByCreatedAtDesc(User tenant);

    long countByCodeStartingWith(String prefix);

    boolean existsByTenantAndListingAndStatusIn(
            User tenant,
            Listing listing,
            Collection<RentalRequest.RequestStatus> statuses
    );
}
