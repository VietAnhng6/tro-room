package com.troroom.backend.repository;
import com.troroom.backend.entity.User;
import com.troroom.backend.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {
            void deleteByUser(User user);
    Optional<RefreshToken> findByToken(String token);
}