
package com.troroom.backend.controller;

import com.troroom.backend.entity.EmailDeliveryFailure;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.EmailDeliveryFailureRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/email-delivery-failures")
public class EmailDeliveryFailureController {

    private final EmailDeliveryFailureRepository repository;

    public EmailDeliveryFailureController(
            EmailDeliveryFailureRepository repository) {
        this.repository = repository;
    }

    private void requireAdmin(Authentication auth) {
        if (auth == null
                || !(auth.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }

        if (user.getRole() != User.Role.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ Admin được xem lịch sử email thất bại");
        }
    }

    @GetMapping
    public List<EmailDeliveryFailure> list(Authentication auth) {
        requireAdmin(auth);
        return repository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/unresolved")
    public List<EmailDeliveryFailure> listUnresolved(Authentication auth) {
        requireAdmin(auth);
        return repository.findByResolvedFalseOrderByCreatedAtDesc();
    }
}
