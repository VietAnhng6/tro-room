package com.troroom.backend.service;

import com.troroom.backend.dto.PaymentReportDtos;
import com.troroom.backend.entity.Invoice;
import com.troroom.backend.entity.PaymentReport;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.InvoiceRepository;
import com.troroom.backend.repository.PaymentReportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import com.troroom.backend.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.util.Date;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.time.LocalDate;
import java.util.List;

@Service
public class PaymentReportService {
    private final JwtService jwtService;
    private final InvoiceRepository invoiceRepository;
    private final PaymentReportRepository paymentReportRepository;
    private final Path proofUploadDir = Paths.get("uploads/payment-proofs");
    public PaymentReportService(
        InvoiceRepository invoiceRepository,
        PaymentReportRepository paymentReportRepository,
        JwtService jwtService) {
    this.invoiceRepository = invoiceRepository;
    this.paymentReportRepository = paymentReportRepository;
    this.jwtService = jwtService;
    }

    /**
     * Khách thuê báo đã thanh toán hóa đơn.
     * Khóa hóa đơn trong transaction để hạn chế hai yêu cầu đồng thời
     * cùng vượt quá công nợ còn lại.
     */
    @Transactional
    public PaymentReportDtos.Response create(
            User currentUser,
            Long invoiceId,
            PaymentReportDtos.CreateRequest request) {

        if (currentUser == null
                || currentUser.getRole() != User.Role.TENANT) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ khách thuê mới được báo thanh toán");
        }

        if (request == null
                || request.amount() == null
                || request.amount() <= 0
                || request.paymentDate() == null
                || request.paymentMethod() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thông tin thanh toán không hợp lệ");
        }

        if (request.paymentDate().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày thanh toán không được ở tương lai");
        }

        Invoice invoice = invoiceRepository
                .findByIdForPaymentUpdate(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hóa đơn"));

        if (invoice.getStatus() != Invoice.Status.ISSUED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ được báo thanh toán hóa đơn đã phát hành");
        }

        if (!invoice.getContract().getTenant().getId()
                .equals(currentUser.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền báo thanh toán hóa đơn này");
        }

        long confirmed = paymentReportRepository
                .sumAmountByInvoiceAndStatus(
                        invoiceId,
                        PaymentReport.Status.CONFIRMED);

        long pending = paymentReportRepository
                .sumAmountByInvoiceAndStatus(
                        invoiceId,
                        PaymentReport.Status.PENDING);

        long outstanding = invoice.getTotalAmount() - confirmed - pending;

        if (outstanding <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hóa đơn không còn công nợ để báo thanh toán");
        }

        if (request.amount() > outstanding) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số tiền báo thanh toán vượt công nợ còn lại: "
                            + outstanding + " VNĐ");
        }

        PaymentReport report = new PaymentReport();
        report.setInvoice(invoice);
        report.setTenant(currentUser);
        report.setAmount(request.amount());
        report.setPaymentDate(request.paymentDate());
        report.setPaymentMethod(request.paymentMethod());
        report.setStatus(PaymentReport.Status.PENDING);

        PaymentReport saved = paymentReportRepository.save(report);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PaymentReportDtos.Response> listMine(User currentUser) {
        if (currentUser == null
                || currentUser.getRole() != User.Role.TENANT) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ khách thuê mới được xem báo cáo thanh toán của mình");
        }

        return paymentReportRepository
                .findByTenantOrderByCreatedAtDesc(currentUser)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PaymentReportDtos.Response detailMine(
            User currentUser, Long reportId) {

        if (currentUser == null
                || currentUser.getRole() != User.Role.TENANT) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ khách thuê mới được xem báo cáo thanh toán");
        }

        PaymentReport report = paymentReportRepository
                .findDetailById(reportId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy báo cáo thanh toán"));

        if (!report.getTenant().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền xem báo cáo này");
        }

        return toResponse(report);
    }

    @Transactional
    public PaymentReportDtos.Response cancelMine(
            User currentUser, Long reportId) {

        if (currentUser == null
                || currentUser.getRole() != User.Role.TENANT) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ khách thuê mới được hủy báo cáo thanh toán");
        }

        PaymentReport report = paymentReportRepository
                .findDetailById(reportId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy báo cáo thanh toán"));

        if (!report.getTenant().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền hủy báo cáo này");
        }

        if (report.getStatus() != PaymentReport.Status.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ được hủy báo cáo đang chờ xác nhận");
        }

        report.setStatus(PaymentReport.Status.CANCELLED);
        return toResponse(paymentReportRepository.save(report));
    }

    private PaymentReportDtos.Response toResponse(PaymentReport report) {
        return new PaymentReportDtos.Response(
                report.getId(),
                report.getInvoice().getId(),
                report.getInvoice().getInvoiceCode(),
                report.getAmount(),
                report.getPaymentDate(),
                report.getPaymentMethod(),
                report.getStatus(),
                report.getProofImagePath() != null
                        && !report.getProofImagePath().isBlank(),
                report.getCreatedAt()
        );
    }
    @Transactional
    public PaymentReportDtos.Response uploadProof(
        User currentUser,
        Long reportId,
        MultipartFile image) throws IOException {

    if (currentUser == null
            || currentUser.getRole() != User.Role.TENANT) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Chỉ khách thuê mới được tải ảnh chứng từ");
    }

    PaymentReport report = paymentReportRepository
            .findDetailById(reportId)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy báo cáo thanh toán"));

    if (!report.getTenant().getId().equals(currentUser.getId())) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Bạn không có quyền tải ảnh cho báo cáo này");
    }

    if (report.getStatus() != PaymentReport.Status.PENDING) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Chỉ được tải ảnh cho báo cáo đang chờ xác nhận");
    }

    if (image == null || image.isEmpty()) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Vui lòng chọn ảnh chứng từ");
    }

    if (image.getSize() > 5L * 1024 * 1024) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Ảnh chứng từ không được vượt quá 5 MB");
    }

    try (var input = image.getInputStream()) {
        BufferedImage decoded = ImageIO.read(input);

        if (decoded == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "File tải lên không phải ảnh hợp lệ");
        }
    }

    String contentType = image.getContentType();

    boolean isJpeg = "image/jpeg".equalsIgnoreCase(contentType);
    boolean isPng = "image/png".equalsIgnoreCase(contentType);

    if (!isJpeg && !isPng) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Ảnh chứng từ phải có định dạng JPG hoặc PNG");
    }

    Files.createDirectories(proofUploadDir);

    String extension = isPng ? ".png" : ".jpg";
    String filename = UUID.randomUUID() + extension;
    Path target = proofUploadDir.resolve(filename).normalize();

    if (!target.startsWith(proofUploadDir.toAbsolutePath().normalize())
            && !target.startsWith(proofUploadDir.normalize())) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Đường dẫn ảnh không hợp lệ");
    }

    try (var input = image.getInputStream()) {
        Files.copy(input, target);
    }

    report.setProofImagePath(target.toString());

    try {
        return toResponse(paymentReportRepository.save(report));
    } catch (RuntimeException ex) {
        Files.deleteIfExists(target);
        throw ex;
    }
    }
    
@Transactional(readOnly = true)
public Path getProofPath(User currentUser, Long reportId) {

    if (currentUser == null) {
        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Vui lòng đăng nhập");
    }

    PaymentReport report = paymentReportRepository
            .findDetailById(reportId)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy báo cáo thanh toán"));

    boolean isAdmin =
            currentUser.getRole() == User.Role.ADMIN;

    boolean isLandlord =
            currentUser.getRole() == User.Role.LANDLORD
            && report.getInvoice().getRoom().getBuilding()
                    .getLandlord() != null
            && report.getInvoice().getRoom().getBuilding()
                    .getLandlord().getId()
                    .equals(currentUser.getId());

    boolean isOwnerTenant =
            currentUser.getRole() == User.Role.TENANT
            && report.getTenant() != null
            && report.getTenant().getId()
                    .equals(currentUser.getId());

    if (!isAdmin && !isLandlord && !isOwnerTenant) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Bạn không có quyền xem chứng từ thanh toán này");
    }

    String imagePath = report.getProofImagePath();

    if (imagePath == null || imagePath.isBlank()) {
        throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Báo cáo chưa có ảnh chứng từ");
    }

    Path path = Paths.get(imagePath).toAbsolutePath().normalize();

    Path proofDirectory = proofUploadDir.toAbsolutePath().normalize();

    if (!path.startsWith(proofDirectory)) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Đường dẫn chứng từ không hợp lệ");
    }

    if (!Files.isRegularFile(path)) {
        throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Không tìm thấy file chứng từ");
    }

    return path;
}

    
    /**
     * Tạo token xem ảnh chứng từ có hiệu lực 15 phút.
     * Chỉ ADMIN hoặc chủ nhà đúng tòa nhà mới tạo được link.
     */
    @Transactional(readOnly = true)
    public String createProofLink(User currentUser, Long reportId) {
    // Kiểm tra quyền và bảo đảm báo cáo có file ảnh hợp lệ.
    getProofPath(currentUser, reportId);

    Date now = new Date();
    Date expiration = new Date(now.getTime() + 15 * 60 * 1000L);

    return Jwts.builder()
            .claim("purpose", "payment-proof")
            .claim("reportId", reportId)
            .issuedAt(now)
            .expiration(expiration)
            .signWith(jwtService.getSecretKey())
            .compact();
    }

    /**
     * Xác thực token xem ảnh và trả về đường dẫn ảnh.
     * Token sai mục đích, sai chữ ký hoặc hết hạn đều bị từ chối.
     */
    @Transactional(readOnly = true)
    public Path getProofPathByToken(String token) {
    try {
        Claims claims = Jwts.parser()
                .verifyWith(jwtService.getSecretKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        if (!"payment-proof".equals(
                claims.get("purpose", String.class))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Token không có quyền xem chứng từ");
        }

        Object idClaim = claims.get("reportId");
        if (!(idClaim instanceof Number)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Token xem chứng từ không hợp lệ");
        }

        Long reportId = ((Number) idClaim).longValue();

        // Kiểm tra lại báo cáo và file, không trả đường dẫn ra ngoài.
        PaymentReport report = paymentReportRepository
                .findDetailById(reportId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy báo cáo thanh toán"));

        String imagePath = report.getProofImagePath();
        if (imagePath == null || imagePath.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Báo cáo chưa có ảnh chứng từ");
        }

        Path path = Paths.get(imagePath).toAbsolutePath().normalize();
        Path proofDirectory = proofUploadDir.toAbsolutePath().normalize();

        if (!path.startsWith(proofDirectory)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Đường dẫn chứng từ không hợp lệ");
        }

        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy file chứng từ");
        }

        return path;
    } catch (ResponseStatusException ex) {
        throw ex;
    } catch (Exception ex) {
        // Bao gồm token sai chữ ký, sai định dạng hoặc đã hết hạn.
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Link xem chứng từ không hợp lệ hoặc đã hết hạn");
    }
    }
    
    /** Chủ nhà xem các báo cáo thanh toán thuộc tòa nhà của mình. */
    @Transactional(readOnly = true)
    public List<PaymentReportDtos.Response> listForLandlord(
            User currentUser) {

    if (currentUser == null
            || currentUser.getRole() != User.Role.LANDLORD) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Chỉ chủ nhà mới được xem báo cáo thanh toán");
    }

    return paymentReportRepository
            .findByLandlordId(currentUser.getId())
            .stream()
            .map(this::toResponse)
            .toList();
    }

    /** Chủ nhà xác nhận báo cáo thanh toán. */
    
/** Chủ nhà xác nhận báo cáo thanh toán. */
@Transactional
public PaymentReportDtos.Response confirm(
        User currentUser, Long reportId) {

    if (currentUser == null
            || currentUser.getRole() != User.Role.LANDLORD) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Chỉ chủ nhà mới được xác nhận thanh toán");
    }

    PaymentReport report = paymentReportRepository
            .findDetailById(reportId)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy báo cáo thanh toán"));

    if (report.getStatus() != PaymentReport.Status.PENDING) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Chỉ được xác nhận báo cáo đang chờ xử lý");
    }

    // Khóa hóa đơn để hạn chế xác nhận đồng thời vượt công nợ.
    Invoice invoice = invoiceRepository
            .findByIdForPaymentUpdate(report.getInvoice().getId())
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy hóa đơn"));

    boolean isOwner = invoice.getRoom().getBuilding().getLandlord() != null
            && invoice.getRoom().getBuilding().getLandlord()
                    .getId().equals(currentUser.getId());

    if (!isOwner) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Bạn không có quyền xử lý báo cáo này");
    }

    if (invoice.getStatus() != Invoice.Status.ISSUED) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Chỉ được xác nhận thanh toán hóa đơn đã phát hành");
    }

    long confirmed = paymentReportRepository
            .sumAmountByInvoiceAndStatus(
                    invoice.getId(),
                    PaymentReport.Status.CONFIRMED);

    long pending = paymentReportRepository
            .sumAmountByInvoiceAndStatus(
                    invoice.getId(),
                    PaymentReport.Status.PENDING);

    // Trừ báo cáo hiện tại khỏi tổng PENDING để không tính trùng.
    long otherPending = pending - report.getAmount();
    long outstanding = invoice.getTotalAmount() - confirmed - otherPending;

    if (report.getAmount() > outstanding) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Số tiền xác nhận vượt công nợ còn lại: "
                        + Math.max(0L, outstanding) + " VNĐ");
    }

    report.setStatus(PaymentReport.Status.CONFIRMED);

    return toResponse(paymentReportRepository.save(report));
}


    /** Chủ nhà từ chối báo cáo thanh toán. */
    @Transactional
    public PaymentReportDtos.Response reject(
        User currentUser, Long reportId) {

    if (currentUser == null
            || currentUser.getRole() != User.Role.LANDLORD) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Chỉ chủ nhà mới được từ chối thanh toán");
    }

    PaymentReport report = paymentReportRepository
            .findDetailById(reportId)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy báo cáo thanh toán"));

    boolean isOwner = report.getInvoice().getRoom()
            .getBuilding().getLandlord() != null
            && report.getInvoice().getRoom()
            .getBuilding().getLandlord().getId()
            .equals(currentUser.getId());

    if (!isOwner) {
        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Bạn không có quyền xử lý báo cáo này");
    }

    if (report.getStatus() != PaymentReport.Status.PENDING) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Chỉ được từ chối báo cáo đang chờ xử lý");
    }

    report.setStatus(PaymentReport.Status.REJECTED);
    return toResponse(paymentReportRepository.save(report));
    }

}