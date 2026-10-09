package com.troroom.backend.repository;

import com.troroom.backend.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    Optional<Contract> findFirstByRoomIdAndStatus(Long roomId, Contract.Status status);

    List<Contract> findByRoomIdOrderByStartDateDesc(Long roomId);

    List<Contract> findByRoomIdOrderByCreatedAtDesc(Long roomId);

    long countByRoomIdAndStatus(Long roomId, Contract.Status status);
}
