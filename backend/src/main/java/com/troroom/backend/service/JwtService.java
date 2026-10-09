package com.troroom.backend.service;

import com.troroom.backend.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private static final long ACCESS_TOKEN_EXPIRATION = 30 * 60 * 1000; // 30 phút

    public JwtService(
            @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}") String secret) {
        String envSecret = System.getenv("JWT_SECRET");
        String finalSecret = (envSecret != null && !envSecret.trim().isEmpty()) ? envSecret : secret;
        this.secretKey = Keys.hmacShaKeyFor(finalSecret.getBytes(StandardCharsets.UTF_8));
    }

    public SecretKey getSecretKey() {
        return secretKey;
    }

    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + ACCESS_TOKEN_EXPIRATION);

        return Jwts.builder()
                .subject(user.getPhone())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(expiration)
                .signWith(secretKey)
                .compact();
    }
}