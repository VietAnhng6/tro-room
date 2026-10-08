package com.troroom.backend.repository;

import com.troroom.backend.entity.Roommate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoommateRepository extends JpaRepository<Roommate, Long> {

    List<Roommate> findByRoomIdAndStatusOrderByStartDateDesc(Long roomId, Roommate.Status status);

    List<Roommate> findByRoomIdOrderByStartDateDesc(Long roomId);

    long countByRoomIdAndStatus(Long roomId, Roommate.Status status);
}
