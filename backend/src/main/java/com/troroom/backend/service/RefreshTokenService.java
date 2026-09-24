package com.troroom.backend.service;

import com.troroom.backend.entity.RefreshToken;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RefreshTokenRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final long REFRESH_TOKEN_DAYS = 7;

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    public RefreshToken createRefreshToken(User user) {

        RefreshToken refreshToken = new RefreshToken();

        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setUser(user);
        refreshToken.setExpiresAt(
                LocalDateTime.now().plusDays(REFRESH_TOKEN_DAYS)
        );
        refreshToken.setRevoked(false);

        return refreshTokenRepository.save(refreshToken);
    }

    public boolean isValid(RefreshToken refreshToken) {

        return !refreshToken.isRevoked()
                && refreshToken.getExpiresAt().isAfter(LocalDateTime.now());
    }

    public void revoke(RefreshToken refreshToken) {
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken getValidRefreshToken(String token) {

        RefreshToken refreshToken = refreshTokenRepository
                .findByToken(token)
                .orElseThrow(() ->
                        new RuntimeException("Refresh token không hợp lệ"));

        if (!isValid(refreshToken)) {
            throw new RuntimeException(
                    "Refresh token đã hết hạn hoặc bị thu hồi"
            );
        }

        return refreshToken;
    }
}