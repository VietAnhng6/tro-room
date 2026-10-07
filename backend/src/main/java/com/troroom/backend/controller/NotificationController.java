package com.troroom.backend.controller;

import com.troroom.backend.entity.Notification;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(notificationService.getNotifications(user));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(notificationService.countUnread(user));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            Authentication auth,
            @PathVariable Long id
    ) {
        User user = (User) auth.getPrincipal();
        notificationService.markAsRead(user, id);
        return ResponseEntity.ok().build();
    }
}