package com.troroom.backend.repository;

import com.troroom.backend.entity.Service;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceRepository extends JpaRepository<Service, Long> {

    List<Service> findByActive(boolean active);

    boolean existsByNameIgnoreCase(String name);
}