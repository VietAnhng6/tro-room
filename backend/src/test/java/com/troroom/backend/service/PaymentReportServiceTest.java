package com.troroom.backend.service;

import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.PaymentReport;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.InvoiceRepository;
import com.troroom.backend.repository.PaymentReportRepository;
import com.troroom.backend.service.JwtService;
import com.troroom.backend.service.PaymentReportService;
import io.jsonwebtoken.Jwts;
import javax.crypto.SecretKey;
import java.util.Date;
import org.springframework.mock.web.MockMultipartFile;
import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentReportServiceTest {
    
@Test
void uploadProof_shouldRejectEmptyImage() throws Exception {
    InvoiceRepository invoiceRepository =
            mock(InvoiceRepository.class);
    PaymentReportRepository reportRepository =
            mock(PaymentReportRepository.class);
    JwtService jwtService = mock(JwtService.class);

    PaymentReportService service = new PaymentReportService(
            invoiceRepository, reportRepository, jwtService);

    User tenant = mock(User.class);
    when(tenant.getRole()).thenReturn(User.Role.TENANT);
    when(tenant.getId()).thenReturn(20L);

    PaymentReport report = mock(PaymentReport.class);
    when(report.getTenant()).thenReturn(tenant);
    when(report.getStatus()).thenReturn(PaymentReport.Status.PENDING);

    when(reportRepository.findDetailById(5L))
            .thenReturn(Optional.of(report));

    MockMultipartFile emptyImage = new MockMultipartFile(
            "image", "proof.png", "image/png", new byte[0]);

    ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.uploadProof(tenant, 5L, emptyImage));

    assertEquals(400, exception.getStatusCode().value());
    verify(reportRepository, never()).save(any());
}

    @Test
    void confirm_shouldRejectWhenAmountExceedsOutstanding() {
        InvoiceRepository invoiceRepository =
                mock(InvoiceRepository.class);
        PaymentReportRepository paymentReportRepository =
                mock(PaymentReportRepository.class);
        JwtService jwtService = mock(JwtService.class);

        PaymentReportService service = new PaymentReportService(
                invoiceRepository,
                paymentReportRepository,
                jwtService
        );

        User landlord = mock(User.class);
        when(landlord.getRole()).thenReturn(User.Role.LANDLORD);
        when(landlord.getId()).thenReturn(10L);

        User tenant = mock(User.class);
        when(tenant.getId()).thenReturn(20L);

        User invoiceLandlord = mock(User.class);
        when(invoiceLandlord.getId()).thenReturn(10L);

        var building = mock(
                com.troroom.backend.entity.Building.class);
        when(building.getLandlord()).thenReturn(invoiceLandlord);

        var room = mock(com.troroom.backend.entity.Room.class);
        when(room.getBuilding()).thenReturn(building);

        var contract = mock(
                com.troroom.backend.entity.RentalContract.class);
        when(contract.getTenant()).thenReturn(tenant);

        Invoice invoice = mock(Invoice.class);
        when(invoice.getId()).thenReturn(9L);
        when(invoice.getTotalAmount()).thenReturn(1_140_000L);
        when(invoice.getStatus()).thenReturn(Invoice.Status.ISSUED);
        when(invoice.getRoom()).thenReturn(room);

        PaymentReport report = mock(PaymentReport.class);
        when(report.getId()).thenReturn(3L);
        when(report.getInvoice()).thenReturn(invoice);
        when(report.getAmount()).thenReturn(600_000L);
        when(report.getStatus()).thenReturn(
                PaymentReport.Status.PENDING);

        when(paymentReportRepository.findDetailById(3L))
                .thenReturn(Optional.of(report));
        when(invoiceRepository.findByIdForPaymentUpdate(9L))
                .thenReturn(Optional.of(invoice));

        // Giả lập dữ liệu bất thường:
        // đã xác nhận 700.000, hai báo cáo PENDING tổng 900.000.
        // Báo cáo hiện tại 600.000, còn một PENDING khác 300.000.
        when(paymentReportRepository.sumAmountByInvoiceAndStatus(
                9L, PaymentReport.Status.CONFIRMED))
                .thenReturn(700_000L);
        when(paymentReportRepository.sumAmountByInvoiceAndStatus(
                9L, PaymentReport.Status.PENDING))
                .thenReturn(900_000L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.confirm(landlord, 3L)
        );

        assertEquals(400, exception.getStatusCode().value());
        verify(paymentReportRepository, never()).save(any());
        verify(report, never()).setStatus(
                PaymentReport.Status.CONFIRMED);
    }

    @Test
    void confirm_shouldUpdateInvoicePaidAmount() {
        InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);
        PaymentReportRepository paymentReportRepository =
                mock(PaymentReportRepository.class);
        PaymentReportService service = new PaymentReportService(
                invoiceRepository, paymentReportRepository, mock(JwtService.class));

        User landlord = mock(User.class);
        when(landlord.getRole()).thenReturn(User.Role.LANDLORD);
        when(landlord.getId()).thenReturn(10L);
        User invoiceLandlord = mock(User.class);
        when(invoiceLandlord.getId()).thenReturn(10L);

        var building = mock(com.troroom.backend.entity.Building.class);
        when(building.getLandlord()).thenReturn(invoiceLandlord);
        var room = mock(com.troroom.backend.entity.Room.class);
        when(room.getBuilding()).thenReturn(building);
        Invoice invoice = mock(Invoice.class);
        when(invoice.getId()).thenReturn(9L);
        when(invoice.getTotalAmount()).thenReturn(1_000L);
        when(invoice.getPaidAmount()).thenReturn(200L);
        when(invoice.getStatus()).thenReturn(Invoice.Status.ISSUED);
        when(invoice.getRoom()).thenReturn(room);

        PaymentReport report = mock(PaymentReport.class);
        when(report.getId()).thenReturn(3L);
        when(report.getInvoice()).thenReturn(invoice);
        when(report.getAmount()).thenReturn(300L);
        when(report.getStatus()).thenReturn(PaymentReport.Status.PENDING);
        when(paymentReportRepository.findDetailById(3L))
                .thenReturn(Optional.of(report));
        when(invoiceRepository.findByIdForPaymentUpdate(9L))
                .thenReturn(Optional.of(invoice));
        when(paymentReportRepository.sumAmountByInvoiceAndStatus(
                9L, PaymentReport.Status.CONFIRMED)).thenReturn(100L);
        when(paymentReportRepository.sumAmountByInvoiceAndStatus(
                9L, PaymentReport.Status.PENDING)).thenReturn(300L);
        when(paymentReportRepository.save(report)).thenReturn(report);

        service.confirm(landlord, 3L);

        verify(invoice).setPaidAmount(500L);
        verify(invoiceRepository).save(invoice);
        verify(report).setStatus(PaymentReport.Status.CONFIRMED);
    }
    
@Test
void getProofPathByToken_shouldRejectExpiredToken() {
    InvoiceRepository invoiceRepository =
            mock(InvoiceRepository.class);
    PaymentReportRepository paymentReportRepository =
            mock(PaymentReportRepository.class);
    JwtService jwtService = mock(JwtService.class);

    SecretKey secretKey = Jwts.SIG.HS384.key().build();
    when(jwtService.getSecretKey()).thenReturn(secretKey);

    PaymentReportService service = new PaymentReportService(
            invoiceRepository,
            paymentReportRepository,
            jwtService
    );

    Date now = new Date();
    String expiredToken = Jwts.builder()
            .claim("purpose", "payment-proof")
            .claim("reportId", 1L)
            .issuedAt(new Date(now.getTime() - 120_000))
            .expiration(new Date(now.getTime() - 60_000))
            .signWith(secretKey)
            .compact();

    ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.getProofPathByToken(expiredToken)
    );

    assertEquals(403, exception.getStatusCode().value());

    verifyNoInteractions(paymentReportRepository);
}

@Test
void cancelMine_shouldCancelPendingReport() {
    InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);
    PaymentReportRepository reportRepository = mock(PaymentReportRepository.class);
    JwtService jwtService = mock(JwtService.class);

    PaymentReportService service = new PaymentReportService(
            invoiceRepository, reportRepository, jwtService);

    User tenant = mock(User.class);
    when(tenant.getRole()).thenReturn(User.Role.TENANT);
    when(tenant.getId()).thenReturn(20L);

    Invoice invoice = mock(Invoice.class);
    when(invoice.getId()).thenReturn(9L);
    when(invoice.getInvoiceCode()).thenReturn("INV-TEST");

    PaymentReport report = mock(PaymentReport.class);
    when(report.getId()).thenReturn(5L);
    when(report.getTenant()).thenReturn(tenant);
    when(report.getInvoice()).thenReturn(invoice);
    when(report.getStatus()).thenReturn(PaymentReport.Status.PENDING);

    when(reportRepository.findDetailById(5L))
            .thenReturn(Optional.of(report));
    when(reportRepository.save(report)).thenReturn(report);

    service.cancelMine(tenant, 5L);

    verify(report).setStatus(PaymentReport.Status.CANCELLED);
    verify(reportRepository).save(report);
}

@Test
void cancelMine_shouldRejectConfirmedReport() {
    InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);
    PaymentReportRepository reportRepository = mock(PaymentReportRepository.class);
    JwtService jwtService = mock(JwtService.class);

    PaymentReportService service = new PaymentReportService(
            invoiceRepository, reportRepository, jwtService);

    User tenant = mock(User.class);
    when(tenant.getRole()).thenReturn(User.Role.TENANT);
    when(tenant.getId()).thenReturn(20L);

    PaymentReport report = mock(PaymentReport.class);
    when(report.getId()).thenReturn(5L);
    when(report.getTenant()).thenReturn(tenant);
    when(report.getStatus()).thenReturn(PaymentReport.Status.CONFIRMED);

    when(reportRepository.findDetailById(5L))
            .thenReturn(Optional.of(report));

    ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.cancelMine(tenant, 5L));

    assertEquals(400, exception.getStatusCode().value());
    verify(reportRepository, never()).save(any());
}

@Test
void uploadProof_shouldRejectInvalidImageContent() throws Exception {
    InvoiceRepository invoiceRepository =
            mock(InvoiceRepository.class);
    PaymentReportRepository reportRepository =
            mock(PaymentReportRepository.class);
    JwtService jwtService = mock(JwtService.class);

    PaymentReportService service = new PaymentReportService(
            invoiceRepository, reportRepository, jwtService);

    User tenant = mock(User.class);
    when(tenant.getRole()).thenReturn(User.Role.TENANT);
    when(tenant.getId()).thenReturn(20L);

    PaymentReport report = mock(PaymentReport.class);
    when(report.getTenant()).thenReturn(tenant);
    when(report.getStatus()).thenReturn(PaymentReport.Status.PENDING);

    when(reportRepository.findDetailById(5L))
            .thenReturn(Optional.of(report));

    MockMultipartFile fakeImage = new MockMultipartFile(
            "image",
            "fake.png",
            "image/png",
            "day khong phai anh".getBytes(
                    java.nio.charset.StandardCharsets.UTF_8));

    ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.uploadProof(tenant, 5L, fakeImage));

    assertEquals(400, exception.getStatusCode().value());
    verify(reportRepository, never()).save(any());
}

@Test
void uploadProof_shouldRejectImageLargerThan5MB() throws Exception {
    InvoiceRepository invoiceRepository =
            mock(InvoiceRepository.class);
    PaymentReportRepository reportRepository =
            mock(PaymentReportRepository.class);
    JwtService jwtService = mock(JwtService.class);

    PaymentReportService service = new PaymentReportService(
            invoiceRepository, reportRepository, jwtService);

    User tenant = mock(User.class);
    when(tenant.getRole()).thenReturn(User.Role.TENANT);
    when(tenant.getId()).thenReturn(20L);

    PaymentReport report = mock(PaymentReport.class);
    when(report.getTenant()).thenReturn(tenant);
    when(report.getStatus()).thenReturn(PaymentReport.Status.PENDING);

    when(reportRepository.findDetailById(5L))
            .thenReturn(Optional.of(report));

    byte[] oversizedContent = new byte[5 * 1024 * 1024 + 1];

    MockMultipartFile oversizedImage = new MockMultipartFile(
            "image",
            "large.png",
            "image/png",
            oversizedContent);

    ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.uploadProof(tenant, 5L, oversizedImage));

    assertEquals(400, exception.getStatusCode().value());
    verify(reportRepository, never()).save(any());
}

@Test
void cancelMine_shouldRejectAnotherTenantsReport() {
    InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);
    PaymentReportRepository reportRepository = mock(PaymentReportRepository.class);
    JwtService jwtService = mock(JwtService.class);

    PaymentReportService service = new PaymentReportService(
            invoiceRepository, reportRepository, jwtService);

    User tenant = mock(User.class);
    when(tenant.getRole()).thenReturn(User.Role.TENANT);
    when(tenant.getId()).thenReturn(20L);

    User anotherTenant = mock(User.class);
    when(anotherTenant.getId()).thenReturn(30L);

    PaymentReport report = mock(PaymentReport.class);
    when(report.getTenant()).thenReturn(anotherTenant);

    when(reportRepository.findDetailById(5L))
            .thenReturn(Optional.of(report));

    ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.cancelMine(tenant, 5L));

    assertEquals(403, exception.getStatusCode().value());
    verify(reportRepository, never()).save(any());
}


}