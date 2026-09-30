package com.troroom.backend.repository;

import com.troroom.backend.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationRepository
        extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findTopByEmailOrderByCreatedAtDesc(String email);
}