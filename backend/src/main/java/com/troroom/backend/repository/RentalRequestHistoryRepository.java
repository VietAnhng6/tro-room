package com.troroom.backend.repository;

import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.RentalRequestHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RentalRequestHistoryRepository extends JpaRepository<RentalRequestHistory, Long> {
    List<RentalRequestHistory> findByRequestOrderByCreatedAtAsc(RentalRequest request);
}