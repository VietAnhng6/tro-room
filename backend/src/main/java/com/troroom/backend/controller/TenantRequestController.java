package com.troroom.backend.controller;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RentalRequestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * S2-09: Khách thuê theo dõi danh sách yêu cầu đã gửi và tự huỷ yêu cầu.
 */
@RestController
@RequestMapping("/api/rental-requests")
public class TenantRequestController {

    private final RentalRequestRepository rentalRequestRepository;

    public TenantRequestController(
            RentalRequestRepository rentalRequestRepository
    ) {
        this.rentalRequestRepository = rentalRequestRepository;
    }

    /*
     * =========================================================
     * XEM DANH SÁCH YÊU CẦU CỦA KHÁCH THUÊ
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

        List<Map<String, Object>> result =
                rentalRequestRepository
                        .findByTenantOrderByCreatedAtDesc(tenant)
                        .stream()
                        .map(this::toItem)
                        .toList();

        return ResponseEntity.ok(result);
    }

    /*
     * =========================================================
     * KHÁCH TỰ HUỶ YÊU CẦU
     * Chỉ khi yêu cầu còn ở trạng thái Mới hoặc Đã hẹn lịch
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

        RentalRequest request = rentalRequestRepository.findById(id)
                .orElse(null);

        if (request == null) {
            return ResponseEntity.notFound().build();
        }

        if (!request.getTenant().getId().equals(tenant.getId())) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                            "message",
                            "Bạn không có quyền huỷ yêu cầu này"
                    ));
        }

        if (request.getStatus() != RentalRequest.Status.OPEN
                && request.getStatus() != RentalRequest.Status.SCHEDULED) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Chỉ huỷ được yêu cầu còn ở trạng thái Mới hoặc Đã hẹn lịch"
                    ));
        }

        request.setStatus(RentalRequest.Status.CANCELLED);
        rentalRequestRepository.save(request);

        return ResponseEntity.ok(
                Map.of(
                        "message", "Đã huỷ yêu cầu",
                        "status", request.getStatus().name()
                )
        );
    }

    private Map<String, Object> toItem(RentalRequest request) {
        Listing listing = request.getListing();

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", request.getId());
        item.put("code", request.getRequestCode());
        item.put("listingId", listing.getId());
        item.put("listingTitle", listing.getTitle());
        item.put("roomId", listing.getRoom().getId());
        item.put("roomCode", listing.getRoom().getCode());
        item.put("buildingName", listing.getRoom().getBuilding().getName());
        item.put("type", request.getType().name());
        item.put("desiredDate",
                request.getDesiredDate() == null
                        ? null
                        : request.getDesiredDate().toString());
        item.put("peopleCount", request.getExpectedPeople());
        item.put("message", request.getMessage());
        item.put("status", request.getStatus().name());
        item.put("appointmentAt",
                request.getScheduledAt() == null
                        ? null
                        : request.getScheduledAt().toString());
        item.put("rejectReason",
                request.getRejectNote() != null
                        ? request.getRejectNote()
                        : (request.getRejectReason() == null
                                ? null
                                : request.getRejectReason().name()));
        item.put("createdAt",
                request.getCreatedAt() == null
                        ? null
                        : request.getCreatedAt().toString());

        return item;
    }
}
