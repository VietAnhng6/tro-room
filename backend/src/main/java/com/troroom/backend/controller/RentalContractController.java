package com.troroom.backend.controller;

import com.troroom.backend.dto.RentalContractCreateRequest;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.RentalContractService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
@RestController
@RequestMapping("/api/landlord/requests")
public class RentalContractController {

    private final RentalContractService contractService;

    public RentalContractController(
            RentalContractService contractService
    ) {
        this.contractService = contractService;
    }

    @PostMapping("/{id}/contract")
    public ResponseEntity<RentalContract> createContract(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody RentalContractCreateRequest request
    ) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof User landlord)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập"
            );
        }

        if (request.getRequestId() == null
                || !request.getRequestId().equals(id)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID yêu cầu thuê không khớp"
            );
        }

        RentalContract contract = contractService.createContract(
                landlord,
                id,
                request.getDeposit(),
                request.getStartDate(),
                request.getTermMonths(),
                request.getBillingCutoffDay(),
                request.getInitialElectricity(),
                request.getInitialWater()
        );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(contract);
        }
        @GetMapping("/contracts")
    public ResponseEntity<?> listContracts(Authentication authentication) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof User landlord)
                || landlord.getRole() != User.Role.LANDLORD) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(java.util.Map.of("message", "Chỉ chủ nhà được xem hợp đồng"));
        }

        List<RentalContract> contracts =
                contractService.listContractsByLandlord(landlord.getId());

        return ResponseEntity.ok(contracts);
    }
}