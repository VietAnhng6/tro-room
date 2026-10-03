package com.troroom.backend.service;

import com.troroom.backend.dto.RentalRequestResponse;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RentalRequestRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

@org.springframework.stereotype.Service
public class RentalRequestService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter YM = DateTimeFormatter.ofPattern("yyyyMM");

    private final RentalRequestRepository repository;

    public RentalRequestService(RentalRequestRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public RentalRequestResponse create(
            Listing listing,
            User tenant,
            RentalRequest.Type type,
            LocalDate desiredDate,
            int expectedPeople,
            String message
    ) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        if (listing.getStatus() != Listing.Status.PUBLISHED
                || listing.getExpiresAt() == null
                || listing.getExpiresAt().isBefore(LocalDateTime.now(VIETNAM_ZONE))
                || listing.getRoom().getStatus() != com.troroom.backend.entity.Room.Status.EMPTY) {
            throw new IllegalStateException("Tin đăng không còn hiệu lực để gửi yêu cầu");
        }

        if (tenant == null || tenant.getRole() != User.Role.TENANT) {
            throw new IllegalStateException("Chỉ tài khoản Khách thuê mới được gửi yêu cầu");
        }

        if (type == null) {
            throw new IllegalArgumentException("Loại yêu cầu phải là Xem phòng hoặc Thuê ngay");
        }

        if (desiredDate == null
                || desiredDate.isBefore(today)
                || desiredDate.isAfter(today.plusDays(60))) {
            throw new IllegalArgumentException(
                    "Ngày mong muốn phải từ hôm nay đến tối đa 60 ngày tới"
            );
        }

        if (expectedPeople <= 0) {
            throw new IllegalArgumentException("Số người dự kiến ở phải lớn hơn 0");
        }

        int maxPeople = listing.getRoom().getMaxPeople();
        if (expectedPeople > maxPeople) {
            throw new IllegalArgumentException(
                    "Số người vượt giới hạn của phòng: tối đa " + maxPeople + " người"
            );
        }

        var existing = repository.findFirstByListingAndTenantAndStatusOrderByCreatedAtDesc(
                listing,
                tenant,
                RentalRequest.Status.OPEN
        );

        if (existing.isPresent()) {
            throw new IllegalStateException(
                    "Bạn đã có yêu cầu đang mở " + existing.get().getRequestCode()
                            + " cho tin này"
            );
        }

        RentalRequest request = new RentalRequest();
        request.setRequestCode(generateCode());
        request.setListing(listing);
        request.setTenant(tenant);
        request.setType(type);
        request.setDesiredDate(desiredDate);
        request.setExpectedPeople(expectedPeople);
        request.setMessage(message == null ? "" : message.trim());
        request.setStatus(RentalRequest.Status.OPEN);
        request.setCreatedAt(LocalDateTime.now(VIETNAM_ZONE));

        try {
            return toResponse(repository.saveAndFlush(request));
        } catch (DataIntegrityViolationException ex) {
            // Đồng thời xử lý race condition nhờ partial unique index ở DB.
            throw new IllegalStateException(
                    "Bạn đã có yêu cầu đang mở cho tin này. Hãy kiểm tra mã yêu cầu cũ."
            );
        }
    }

    private String generateCode() {
        YearMonth month = YearMonth.now(VIETNAM_ZONE);
        for (int attempt = 0; attempt < 100; attempt++) {
            int random = ThreadLocalRandom.current().nextInt(0, 10000);
            String code = "YC-" + month.format(YM) + "-" + String.format("%04d", random);
            if (!repository.existsByRequestCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Không thể tạo mã yêu cầu, vui lòng thử lại");
    }

    private RentalRequestResponse toResponse(RentalRequest request) {
        return new RentalRequestResponse(
                request.getRequestCode(),
                request.getType().name(),
                request.getDesiredDate(),
                request.getExpectedPeople(),
                request.getMessage(),
                request.getStatus().name(),
                request.getCreatedAt()
        );
    }
}
