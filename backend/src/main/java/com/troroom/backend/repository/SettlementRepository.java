package com.troroom.backend.repository;

import com.troroom.backend.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    Optional<Settlement> findByContractId(Long contractId);

    boolean existsByContractId(Long contractId);
}
