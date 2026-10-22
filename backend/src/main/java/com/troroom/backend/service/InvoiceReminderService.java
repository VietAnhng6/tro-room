
package com.troroom.backend.service;

import com.troroom.backend.entity.EmailDeliveryFailure;
import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.EmailDeliveryFailureRepository;
import com.troroom.backend.repository.InvoiceRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class InvoiceReminderService {

    private static final int MAX_ATTEMPTS = 3;
    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private static final String DUE_SUBJECT =
            "TroRoom - Nhắc hóa đơn sắp đến hạn";

    private static final String OVERDUE_SUBJECT =
            "TroRoom - Thông báo hóa đơn quá hạn";

    private final EmailDeliveryFailureRepository failureRepository;
    private final InvoiceRepository invoiceRepository;
    private final MailService mailService;
    private final NotificationService notificationService;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    public InvoiceReminderService(
            InvoiceRepository invoiceRepository,
            MailService mailService,
            EmailDeliveryFailureRepository failureRepository,
            NotificationService notificationService) {
        this.invoiceRepository = invoiceRepository;
        this.mailService = mailService;
        this.failureRepository = failureRepository;
        this.notificationService = notificationService;
    }

    /**
     * S4-08: Nhắc hóa đơn lúc 08:00 mỗi ngày theo giờ Việt Nam.
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    public void sendDailyReminders() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        List<Invoice> invoices =
                invoiceRepository.findUnpaidInvoicesForReminders();

        for (Invoice invoice : invoices) {
            if (invoice.getStatus() != Invoice.Status.ISSUED
                    && invoice.getStatus()
                    != Invoice.Status.PARTIALLY_PAID) {
                continue;
            }

            if (invoice.getDueDate() == null
                    || invoice.getRemainingAmount() <= 0) {
                continue;
            }

            LocalDate dueDate = invoice.getDueDate();

            if (dueDate.equals(today.plusDays(2))) {
                sendReminder(
                        invoice,
                        DUE_SUBJECT,
                        "Hóa đơn của bạn sẽ đến hạn thanh toán vào "
                                + dueDate + "."
                );
            } else if (dueDate.isBefore(today)) {
                sendReminder(
                        invoice,
                        OVERDUE_SUBJECT,
                        "Hóa đơn của bạn đã quá hạn thanh toán từ ngày "
                                + dueDate + "."
                );
            }
        }
    }

    private void sendReminder(
            Invoice invoice,
            String subject,
            String reminderText) {

        User tenant = invoice.getContract().getTenant();
        User landlord = invoice.getRoom()
                .getBuilding().getLandlord();

        // Tạo thông báo trong ứng dụng, độc lập với việc gửi email.
        try {
            if (DUE_SUBJECT.equals(subject)) {
                notificationService.notifyInvoiceDueReminder(
                        invoice, tenant, landlord);
            } else if (OVERDUE_SUBJECT.equals(subject)) {
                notificationService.notifyInvoiceOverdue(
                        invoice, tenant, landlord);
            }
        } catch (Exception e) {
            System.err.println(
                    "S4-08: Không tạo được thông báo cho hóa đơn "
                            + invoice.getInvoiceCode() + ": "
                            + e.getMessage());
        }

        String email = tenant.getEmail();

        if (email == null || email.isBlank()) {
            System.err.println(
                    "S4-08: Người thuê chưa có email cho hóa đơn "
                            + invoice.getInvoiceCode());
            return;
        }

        Exception lastException = null;

        // Thử gửi tối đa 3 lần.
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                mailService.sendInvoiceReminderMail(
                        email,
                        subject,
                        invoice.getInvoiceCode(),
                        invoice.getPeriod(),
                        invoice.getTotalAmount(),
                        invoice.getRemainingAmount(),
                        invoice.getDueDate().toString(),
                        reminderText,
                        baseUrl + "/tenant/invoices"
                );

                // Gửi thành công thì không ghi nhận lỗi.
                return;
            } catch (Exception e) {
                lastException = e;
                System.err.println(
                        "S4-08: Gửi email lần " + attempt
                                + "/" + MAX_ATTEMPTS
                                + " thất bại cho hóa đơn "
                                + invoice.getInvoiceCode()
                                + ": " + e.getMessage());
            }
        }

        // Chỉ ghi lịch sử khi cả 3 lần gửi đều thất bại.
        try {
            EmailDeliveryFailure failure =
                    new EmailDeliveryFailure();

            failure.setInvoice(invoice);
            failure.setRecipientEmail(email);
            failure.setAttemptCount(MAX_ATTEMPTS);
            failure.setErrorMessage(
                    lastException != null
                            && lastException.getMessage() != null
                            ? lastException.getMessage()
                            : "Gửi email thất bại sau 3 lần thử"
            );

            failureRepository.save(failure);
        } catch (Exception e) {
            System.err.println(
                    "S4-08: Không lưu được lịch sử email lỗi cho hóa đơn "
                            + invoice.getInvoiceCode()
                            + ": " + e.getMessage());
        }
    }
}
