package com.troroom.backend.repository;

import com.troroom.backend.entity.TenantProfile;
import com.troroom.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantProfileRepository extends JpaRepository<TenantProfile, Long> {
    Optional<TenantProfile> findByUser(User user);

    Optional<TenantProfile> findByUserId(Long userId);
}