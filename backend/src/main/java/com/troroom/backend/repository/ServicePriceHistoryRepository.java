package com.troroom.backend.repository;

import com.troroom.backend.entity.Service;
import com.troroom.backend.entity.ServicePriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ServicePriceHistoryRepository
        extends JpaRepository<ServicePriceHistory, Long> {

    List<ServicePriceHistory> findByServiceOrderByEffectiveFromDesc(
            Service service
    );

    List<ServicePriceHistory> findByServiceAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
            Service service,
            LocalDate date
    );
}