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

@RestController
@RequestMapping("/api/landlord/requests")
public class RentalContractController {

    private final RentalContractService contractService;

    public RentalContractController(RentalContractService contractService) {
        this.contractService = contractService;
    }

    @PostMapping("/{id}/contract")
    public ResponseEntity<RentalContract> createContract(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody RentalContractCreateRequest request
    ) {
        User landlord = (User) authentication.getPrincipal();

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
}