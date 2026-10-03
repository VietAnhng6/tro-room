package com.troroom.backend.controller;

import com.troroom.backend.dto.RentalRequestResponse;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.repository.RentalRequestRepository;
import com.troroom.backend.service.AuditLogService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rental-requests")
public class RentalRequestController {

    private final RentalRequestRepository rentalRequestRepository;
    private final ListingRepository listingRepository;
    private final AuditLogService auditLogService;

    private static final List<RentalRequest.RequestStatus> OPEN_STATUSES =
            List.of(
                    RentalRequest.RequestStatus.NEW,
                    RentalRequest.RequestStatus.SCHEDULED,
                    RentalRequest.RequestStatus.APPROVED
            );

    public RentalRequestController(
            RentalRequestRepository rentalRequestRepository,
            ListingRepository listingRepository,
            AuditLogService auditLogService
    ) {
        this.rentalRequestRepository = rentalRequestRepository;
        this.listingRepository = listingRepository;
        this.auditLogService = auditLogService;
    }

    /*
     * =========================================================
     * TẠO YÊU CẦU THUÊ (S2-06 tối thiểu)
     * Chỉ TENANT
     * =========================================================
     */
    @PostMapping
    public ResponseEntity<?> createRequest(
            Authentication authentication,
            @RequestBody Map<String, Object> request
    ) {

        User tenant = (User) authentication.getPrincipal();

        if (!"TENANT".equals(tenant.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ khách thuê mới được gửi yêu cầu"
                    ));
        }

        Long listingId = request.get("listingId") == null
                ? null
                : ((Number) request.get("listingId")).longValue();

        String typeValue = (String) request.get("type");
        String desiredDateValue = (String) request.get("desiredDate");

        Integer peopleCount = request.get("peopleCount") == null
                ? null
                : ((Number) request.get("peopleCount")).intValue();

        String message = (String) request.get("message");

        if (listingId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Phải chọn tin đăng"
                    ));
        }

        Listing listing = listingRepository
                .findById(listingId)
                .orElse(null);

        if (listing == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Không tìm thấy tin đăng"
                    ));
        }

        if (listing.getStatus() != Listing.ListingStatus.VISIBLE) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Tin đăng không còn hiển thị"
                    ));
        }

        RentalRequest.RequestType type;

        try {
            type = RentalRequest.RequestType.valueOf(
                    typeValue.toUpperCase()
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Loại yêu cầu không hợp lệ. Dùng VIEW hoặc RENT_NOW"
                    ));
        }

        if (desiredDateValue == null
                || desiredDateValue.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Phải chọn ngày mong muốn"
                    ));
        }

        LocalDate desiredDate;

        try {
            desiredDate = LocalDate.parse(desiredDateValue);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Ngày mong muốn không hợp lệ"
                    ));
        }

        LocalDate today = LocalDate.now();

        if (desiredDate.isBefore(today)) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Ngày mong muốn không được là ngày quá khứ"
                    ));
        }

        if (desiredDate.isAfter(today.plusDays(60))) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Ngày mong muốn không được xa quá 60 ngày"
                    ));
        }

        if (peopleCount == null || peopleCount <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Số người dự kiến phải lớn hơn 0"
                    ));
        }

        int maxPeople = listing.getRoom().getMaxPeople();

        if (peopleCount > maxPeople) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Số người dự kiến vượt quá "
                                    + maxPeople
                                    + " người của phòng"
                    ));
        }

        if (rentalRequestRepository
                .existsByTenantAndListingAndStatusIn(
                        tenant,
                        listing,
                        OPEN_STATUSES
                )) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Bạn đã có yêu cầu đang mở cho tin đăng này"
                    ));
        }

        RentalRequest rentalRequest = new RentalRequest();

        rentalRequest.setCode(generateCode());
        rentalRequest.setTenant(tenant);
        rentalRequest.setListing(listing);
        rentalRequest.setType(type);
        rentalRequest.setDesiredDate(desiredDate);
        rentalRequest.setPeopleCount(peopleCount);
        rentalRequest.setMessage(
                message == null ? null : message.trim()
        );
        rentalRequest.setStatus(RentalRequest.RequestStatus.NEW);
        rentalRequest.setCreatedAt(LocalDateTime.now());
        rentalRequest.setUpdatedAt(LocalDateTime.now());

        rentalRequestRepository.save(rentalRequest);

        auditLogService.log(
                tenant,
                "CREATE",
                "RENTAL_REQUEST",
                rentalRequest.getId(),
                null,
                Map.of(
                        "id", rentalRequest.getId(),
                        "code", rentalRequest.getCode(),
                        "listingId", listing.getId(),
                        "type", rentalRequest.getType().name(),
                        "status", rentalRequest.getStatus().name()
                )
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Gửi yêu cầu thành công",
                        "requestId", rentalRequest.getId(),
                        "code", rentalRequest.getCode()
                )
        );
    }

    /*
     * =========================================================
     * DANH SÁCH YÊU CẦU CỦA TÔI (S2-09)
     * Chỉ TENANT, xem yêu cầu của chính mình
     * =========================================================
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyRequests(
            Authentication authentication
    ) {

        User tenant = (User) authentication.getPrincipal();

        if (!"TENANT".equals(tenant.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ khách thuê mới xem được yêu cầu của mình"
                    ));
        }

        List<RentalRequestResponse> result =
                rentalRequestRepository
                        .findByTenantOrderByCreatedAtDesc(tenant)
                        .stream()
                        .map(RentalRequestController::toResponse)
                        .toList();

        return ResponseEntity.ok(result);
    }

    /*
     * =========================================================
     * KHÁCH TỰ HUỶ YÊU CẦU (S2-09)
     * Chỉ TENANT, chỉ khi còn Mới hoặc Đã hẹn lịch
     * =========================================================
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelRequest(
            Authentication authentication,
            @PathVariable Long id
    ) {

        User tenant = (User) authentication.getPrincipal();

        if (!"TENANT".equals(tenant.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ khách thuê mới được huỷ yêu cầu"
                    ));
        }

        RentalRequest rentalRequest =
                rentalRequestRepository.findById(id).orElse(null);

        if (rentalRequest == null) {
            return ResponseEntity.notFound().build();
        }

        if (!rentalRequest.getTenant().getId()
                .equals(tenant.getId())) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền huỷ yêu cầu này"
                    ));
        }

        if (rentalRequest.getStatus()
                        != RentalRequest.RequestStatus.NEW
                && rentalRequest.getStatus()
                        != RentalRequest.RequestStatus.SCHEDULED) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Chỉ huỷ được yêu cầu còn ở trạng thái Mới hoặc Đã hẹn lịch"
                    ));
        }

        Map<String, Object> beforeData =
                Map.of(
                        "id", rentalRequest.getId(),
                        "code", rentalRequest.getCode(),
                        "status", rentalRequest.getStatus().name()
                );

        rentalRequest.setStatus(
                RentalRequest.RequestStatus.CANCELLED
        );
        rentalRequest.setUpdatedAt(LocalDateTime.now());

        rentalRequestRepository.save(rentalRequest);

        auditLogService.log(
                tenant,
                "UPDATE",
                "RENTAL_REQUEST",
                rentalRequest.getId(),
                beforeData,
                Map.of(
                        "id", rentalRequest.getId(),
                        "code", rentalRequest.getCode(),
                        "status", rentalRequest.getStatus().name()
                )
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Đã huỷ yêu cầu",
                        "status",
                        rentalRequest.getStatus().name()
                )
        );
    }

    /*
     * =========================================================
     * CHỦ TRỌ ĐỔI TRẠNG THÁI (S2-08 tối thiểu)
     * Chỉ LANDLORD sở hữu tòa nhà chứa phòng của tin
     * =========================================================
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {

        User landlord = (User) authentication.getPrincipal();

        if (!"LANDLORD".equals(landlord.getRole().name())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Chỉ chủ trọ mới được xử lý yêu cầu"
                    ));
        }

        RentalRequest rentalRequest =
                rentalRequestRepository.findById(id).orElse(null);

        if (rentalRequest == null) {
            return ResponseEntity.notFound().build();
        }

        Listing listing = rentalRequest.getListing();

        if (listing.getRoom().getBuilding().getLandlord() == null
                || !listing.getRoom().getBuilding().getLandlord()
                        .getId()
                        .equals(landlord.getId())) {

            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền xử lý yêu cầu này"
                    ));
        }

        String statusValue = (String) request.get("status");

        if (statusValue == null || statusValue.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Trạng thái không được để trống"
                    ));
        }

        RentalRequest.RequestStatus targetStatus;

        try {
            targetStatus = RentalRequest.RequestStatus.valueOf(
                    statusValue.toUpperCase()
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Trạng thái không hợp lệ"
                    ));
        }

        if (rentalRequest.getStatus()
                != RentalRequest.RequestStatus.NEW) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Chỉ xử lý được yêu cầu còn ở trạng thái Mới"
                    ));
        }

        LocalDateTime appointmentAt = null;
        String rejectReason = null;

        if (targetStatus
                == RentalRequest.RequestStatus.SCHEDULED) {

            String appointmentValue =
                    (String) request.get("appointmentAt");

            if (appointmentValue == null
                    || appointmentValue.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Xác nhận lịch hẹn phải chọn ngày giờ"
                        ));
            }

            try {
                appointmentAt = LocalDateTime.parse(
                        appointmentValue.replace(' ', 'T')
                );
            } catch (Exception e) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Ngày giờ hẹn không hợp lệ"
                        ));
            }
        }

        if (targetStatus
                == RentalRequest.RequestStatus.REJECTED) {

            rejectReason = (String) request.get("rejectReason");

            if (rejectReason == null
                    || rejectReason.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Từ chối phải chọn lý do"
                        ));
            }
        }

        if (targetStatus == RentalRequest.RequestStatus.CANCELLED) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Chủ trọ không được tự huỷ yêu cầu của khách"
                    ));
        }

        Map<String, Object> beforeData =
                Map.of(
                        "id", rentalRequest.getId(),
                        "code", rentalRequest.getCode(),
                        "status", rentalRequest.getStatus().name()
                );

        rentalRequest.setStatus(targetStatus);
        rentalRequest.setAppointmentAt(appointmentAt);
        rentalRequest.setRejectReason(
                rejectReason == null ? null : rejectReason.trim()
        );
        rentalRequest.setUpdatedAt(LocalDateTime.now());

        rentalRequestRepository.save(rentalRequest);

        auditLogService.log(
                landlord,
                "UPDATE",
                "RENTAL_REQUEST",
                rentalRequest.getId(),
                beforeData,
                Map.of(
                        "id", rentalRequest.getId(),
                        "code", rentalRequest.getCode(),
                        "status", rentalRequest.getStatus().name(),
                        "appointmentAt",
                                rentalRequest.getAppointmentAt() == null
                                        ? ""
                                        : rentalRequest.getAppointmentAt()
                                                .toString(),
                        "rejectReason",
                                rentalRequest.getRejectReason() == null
                                        ? ""
                                        : rentalRequest.getRejectReason()
                )
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Cập nhật trạng thái thành công",
                        "status",
                        rentalRequest.getStatus().name()
                )
        );
    }

    /*
     * =========================================================
     * Sinh mã yêu cầu dạng YC-yyyyMM-xxxx
     * =========================================================
     */
    private String generateCode() {

        String prefix = "YC-"
                + LocalDate.now().format(
                        DateTimeFormatter.ofPattern("yyyyMM")
                )
                + "-";

        long count = rentalRequestRepository
                .countByCodeStartingWith(prefix);

        return prefix + String.format("%04d", count + 1);
    }

    private static RentalRequestResponse toResponse(
            RentalRequest rentalRequest
    ) {

        Listing listing = rentalRequest.getListing();

        return new RentalRequestResponse(
                rentalRequest.getId(),
                rentalRequest.getCode(),
                listing.getId(),
                listing.getTitle(),
                listing.getRoom().getId(),
                listing.getRoom().getCode(),
                listing.getRoom().getBuilding().getName(),
                rentalRequest.getType().name(),
                rentalRequest.getDesiredDate(),
                rentalRequest.getPeopleCount(),
                rentalRequest.getMessage(),
                rentalRequest.getStatus().name(),
                rentalRequest.getAppointmentAt(),
                rentalRequest.getRejectReason(),
                rentalRequest.getCreatedAt()
        );
    }
}
