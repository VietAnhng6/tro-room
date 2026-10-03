package com.troroom.backend.service;

import com.troroom.backend.entity.EmailVerification;
import com.troroom.backend.repository.EmailVerificationRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class EmailVerificationService {

    private final EmailVerificationRepository repository;
    private final MailService mailService;

    public EmailVerificationService(
            EmailVerificationRepository repository,
            MailService mailService) {
        this.repository = repository;
        this.mailService = mailService;
    }

    public void sendOtp(String email, String otp) {
        mailService.sendVerificationOtpMail(email, otp);
    }

    public boolean verifyOtp(String email, String otp) {

        EmailVerification verification =
                repository.findTopByEmailOrderByCreatedAtDesc(email)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy mã xác minh"
                                ));

        if (verification.getExpiresAt()
                .isBefore(LocalDateTime.now())) {

            throw new RuntimeException(
                    "Mã xác minh đã hết hạn"
            );
        }

        if (!verification.getOtp().equals(otp)) {
            throw new RuntimeException(
                    "Mã xác minh không chính xác"
            );
        }

        repository.delete(verification);

        return true;
    }
}