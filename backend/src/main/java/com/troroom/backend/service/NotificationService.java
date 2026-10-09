package com.troroom.backend.service;

import com.troroom.backend.entity.Notification;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void notifyRequestScheduled(RentalRequest request) {
        User landlord = request.getListing()
                .getRoom()
                .getBuilding()
                .getLandlord();

        Notification notification = new Notification();
        notification.setUser(request.getTenant());
        notification.setType(Notification.Type.REQUEST_ACCEPTED);
        notification.setTitle("Yêu cầu xem phòng đã được xác nhận");
        notification.setMessage(
                "Chủ nhà " + safe(landlord.getName())
                        + " đã xác nhận lịch xem phòng vào "
                        + request.getScheduledAt()
        );
        notification.setLandlordName(landlord.getName());
        notification.setLandlordPhone(landlord.getPhone());
        notification.setLandlordEmail(landlord.getEmail());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);

        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyRequestRejected(RentalRequest request) {
        User landlord = request.getListing()
                .getRoom()
                .getBuilding()
                .getLandlord();

        Notification notification = new Notification();
        notification.setUser(request.getTenant());
        notification.setType(Notification.Type.REQUEST_REJECTED);
        notification.setTitle("Yêu cầu xem phòng đã bị từ chối");

        String reason = request.getRejectNote();

        notification.setMessage(
                "Chủ nhà " + safe(landlord.getName())
                        + " đã từ chối yêu cầu xem phòng"
                        + (reason == null || reason.isBlank() ? "." : ": " + reason)
        );

        notification.setLandlordName(landlord.getName());
        notification.setLandlordPhone(landlord.getPhone());
        notification.setLandlordEmail(landlord.getEmail());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);

        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotifications(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional(readOnly = true)
    public long countUnread(User user) {
        return notificationRepository.countByUserAndReadFalse(user);
    }

    @Transactional
    public void markAsRead(User user, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo"));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bạn không có quyền xem thông báo này");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "chủ nhà" : value;
    }
}