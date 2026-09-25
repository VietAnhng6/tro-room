package com.troroom.backend.service;

import com.troroom.backend.entity.PasswordResetToken;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.PasswordResetTokenRepository;
import com.troroom.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final int MAX_REQUESTS_PER_HOUR = 3;
    private static final int TOKEN_EXPIRATION_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final MailService mailService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
   public PasswordResetService(
        UserRepository userRepository,
        PasswordResetTokenRepository tokenRepository,
        MailService mailService,
        PasswordEncoder passwordEncoder,
        RefreshTokenService refreshTokenService) {

        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.mailService = mailService;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
    }

    public void requestReset(String email) {

        User user = userRepository.findByEmail(email)
                .orElse(null);

        // Không tiết lộ email có tồn tại hay không
        if (user == null || user.getEmail() == null) {
            return;
        }

        LocalDateTime oneHourAgo =
                LocalDateTime.now().minusHours(1);

        long requestCount =
                tokenRepository.countByUserAndCreatedAtAfter(
                        user,
                        oneHourAgo
                );

        if (requestCount >= MAX_REQUESTS_PER_HOUR) {
            throw new RuntimeException(
                    "Đã vượt quá số lần yêu cầu đặt lại mật khẩu trong 1 giờ"
            );
        }

        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken =
                new PasswordResetToken();

        resetToken.setToken(token);
        resetToken.setUser(user);
        resetToken.setCreatedAt(LocalDateTime.now());
        resetToken.setExpiresAt(
                LocalDateTime.now()
                        .plusMinutes(TOKEN_EXPIRATION_MINUTES)
        );
        resetToken.setUsed(false);

        tokenRepository.save(resetToken);

        String resetLink =
                "http://localhost:5173/reset-password?token="
                        + token;

        mailService.sendResetPasswordMail(
                user.getEmail(),
                resetLink
        );
    }

    public PasswordResetToken validateToken(String token) {

        PasswordResetToken resetToken =
                tokenRepository.findByToken(token)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Link đặt lại mật khẩu không hợp lệ"
                                ));

        if (resetToken.isUsed()) {
            throw new RuntimeException(
                    "Link đặt lại mật khẩu đã được sử dụng"
            );
        }

        if (resetToken.getExpiresAt()
                .isBefore(LocalDateTime.now())) {

            throw new RuntimeException(
                    "Link đặt lại mật khẩu đã hết hạn"
            );
        }

        return resetToken;
    }

    public void resetPassword(
            String token,
            String newPassword) {

        PasswordResetToken resetToken =
                validateToken(token);

        User user = resetToken.getUser();

        user.setPassword(
                passwordEncoder.encode(newPassword)
        );

        user.setMustChangePassword(false);

        userRepository.save(user);

        // Token chỉ được sử dụng một lần
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }
}