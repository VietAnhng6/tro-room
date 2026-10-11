
package com.troroom.backend.repository;

import com.troroom.backend.entity.ContractRenewal;
import com.troroom.backend.entity.RentalContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractRenewalRepository
        extends JpaRepository<ContractRenewal, Long> {

    List<ContractRenewal> findByContractOrderByCreatedAtDesc(
            RentalContract contract);
    List<ContractRenewal> findByContract_IdOrderByStartDateAsc(
        Long contractId);
}
