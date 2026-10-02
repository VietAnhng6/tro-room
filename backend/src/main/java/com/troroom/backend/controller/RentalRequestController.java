package com.troroom.backend.controller;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.service.RentalRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/public/listings")
public class RentalRequestController {

    private final ListingRepository listingRepository;
    private final RentalRequestService rentalRequestService;

    public RentalRequestController(
            ListingRepository listingRepository,
            RentalRequestService rentalRequestService
    ) {
        this.listingRepository = listingRepository;
        this.rentalRequestService = rentalRequestService;
    }

    @PostMapping("/{listingId}/requests")
    public ResponseEntity<?> createRequest(
            Authentication authentication,
            @PathVariable Long listingId,
            @RequestBody Map<String, Object> body
    ) {
        if (authentication == null || !(authentication.getPrincipal() instanceof User tenant)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập tài khoản Khách thuê để gửi yêu cầu"));
        }

        Listing listing = listingRepository.findById(listingId).orElse(null);
        if (listing == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            RentalRequest.Type type = RentalRequest.Type.valueOf(
                    String.valueOf(body.get("type")).trim().toUpperCase()
            );
            LocalDate desiredDate = LocalDate.parse(
                    String.valueOf(body.get("desiredDate"))
            );
            int expectedPeople = Integer.parseInt(
                    String.valueOf(body.get("expectedPeople"))
            );
            String message = body.get("message") == null
                    ? ""
                    : String.valueOf(body.get("message"));

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(rentalRequestService.create(
                            listing,
                            tenant,
                            type,
                            desiredDate,
                            expectedPeople,
                            message
                    ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", ex.getMessage() == null
                            ? "Dữ liệu yêu cầu không hợp lệ"
                            : ex.getMessage()));
        }
    }
}
