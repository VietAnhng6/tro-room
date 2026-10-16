
package com.troroom.backend.service;

import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.Notification;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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
public void notifyRequestApproved(RentalRequest request) {
    User landlord = request.getListing()
            .getRoom()
            .getBuilding()
            .getLandlord();

    Notification notification = new Notification();
    notification.setUser(request.getTenant());
    notification.setType(Notification.Type.REQUEST_ACCEPTED);
    notification.setTitle("Yêu cầu thuê phòng đã được chấp nhận");
    notification.setMessage(
            "Chủ nhà " + safe(landlord.getName())
                    + " đã chấp nhận yêu cầu thuê phòng của bạn."
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
                        + (reason == null || reason.isBlank()
                                ? "." : ": " + reason)
        );

        notification.setLandlordName(landlord.getName());
        notification.setLandlordPhone(landlord.getPhone());
        notification.setLandlordEmail(landlord.getEmail());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);

        notificationRepository.save(notification);
    }

    /**
     * Tạo thông báo cho khách thuê khi hóa đơn được phát hành.
     *
     * Chạy trong transaction riêng (REQUIRES_NEW) để nếu tạo thông báo lỗi
     * thì không làm rollback việc phát hành hóa đơn.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyInvoiceIssued(
            Invoice invoice,
            User tenant,
            User landlord
    ) {
        Notification notification = new Notification();
        notification.setUser(tenant);
        notification.setType(Notification.Type.INVOICE_ISSUED);
        notification.setTitle("Hóa đơn tiền phòng đã được phát hành");
        notification.setMessage(
                "Hóa đơn kỳ " + invoice.getPeriod()
                        + " đã được phát hành. Mã hóa đơn: "
                        + invoice.getInvoiceCode()
        );
        notification.setLandlordName(landlord.getName());
        notification.setLandlordPhone(landlord.getPhone());
        notification.setLandlordEmail(landlord.getEmail());
        notification.setCreatedAt(LocalDateTime.now());
        notification.setRead(false);

        notificationRepository.save(notification);
    }
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void notifyInvoiceDueReminder(
        Invoice invoice,
        User tenant,
        User landlord
) {
    createInvoiceReminderNotification(
            invoice,
            tenant,
            landlord,
            Notification.Type.INVOICE_DUE_REMINDER,
            "Hóa đơn sắp đến hạn",
            "Hóa đơn kỳ " + invoice.getPeriod()
                    + ", mã " + invoice.getInvoiceCode()
                    + " sẽ đến hạn ngày " + invoice.getDueDate() + "."
    );
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void notifyInvoiceOverdue(
        Invoice invoice,
        User tenant,
        User landlord
) {
    createInvoiceReminderNotification(
            invoice,
            tenant,
            landlord,
            Notification.Type.INVOICE_OVERDUE_REMINDER,
            "Hóa đơn đã quá hạn",
            "Hóa đơn kỳ " + invoice.getPeriod()
                    + ", mã " + invoice.getInvoiceCode()
                    + " đã quá hạn từ ngày " + invoice.getDueDate() + "."
    );
}

private void createInvoiceReminderNotification(
        Invoice invoice,
        User tenant,
        User landlord,
        Notification.Type type,
        String title,
        String message
) {
    String invoiceCode = invoice.getInvoiceCode();

    if (notificationRepository.existsByUserAndTypeAndMessageContaining(
            tenant, type, invoiceCode)) {
        return;
    }

    Notification notification = new Notification();
    notification.setUser(tenant);
    notification.setType(type);
    notification.setTitle(title);
    notification.setMessage(message);
    notification.setLandlordName(landlord.getName());
    notification.setLandlordPhone(landlord.getPhone());
    notification.setLandlordEmail(landlord.getEmail());
    notification.setCreatedAt(LocalDateTime.now());
    notification.setRead(false);

    notificationRepository.save(notification);
 }

    @Transactional(readOnly = true)
    public List<Notification> getNotifications(User user) {
        return notificationRepository
                .findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional(readOnly = true)
    public long countUnread(User user) {
        return notificationRepository
                .countByUserAndReadFalse(user);
    }

    @Transactional
    public void markAsRead(User user, Long notificationId) {
        Notification notification =
                notificationRepository.findById(notificationId)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Không tìm thấy thông báo"));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException(
                    "Bạn không có quyền xem thông báo này");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    private String safe(String value) {
        return value == null || value.isBlank()
                ? "chủ nhà" : value;
    }
}