package com.troroom.backend.controller;

import com.troroom.backend.dto.ContractRenewalRequest;
import com.troroom.backend.dto.RentalContractCreateRequest;
import com.troroom.backend.entity.ContractRenewal;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.RentalContractService;
import com.troroom.backend.dto.ContractRenewalResponse;
import java.util.stream.Collectors;
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

    /**
     * Tạo hợp đồng từ yêu cầu thuê phòng.
     *
     * POST /api/landlord/requests/{id}/contract
     */
    @PostMapping("/{id}/contract")
    public ResponseEntity<RentalContract> createContract(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody RentalContractCreateRequest request
    ) {
        User landlord = getAuthenticatedLandlord(authentication);

        if (id == null || id <= 0
                || request.getRequestId() == null
                || !request.getRequestId().equals(id)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID yêu cầu thuê không hợp lệ hoặc không khớp"
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

    /**
     * Lấy danh sách hợp đồng thuộc chủ nhà đang đăng nhập.
     *
     * GET /api/landlord/requests/contracts
     */
    @GetMapping("/contracts")
    public ResponseEntity<List<RentalContract>> listContracts(
            Authentication authentication
    ) {
        User landlord = getAuthenticatedLandlord(authentication);

        List<RentalContract> contracts =
                contractService.listContractsByLandlord(landlord.getId());

        return ResponseEntity.ok(contracts);
    }

    /**
     * Gia hạn hợp đồng.
     *
     * POST /api/landlord/requests/contracts/{contractId}/renew
     *
     * Body gồm:
     * - termMonths: số tháng gia hạn
     * - rent: giá thuê mới, có thể bỏ trống để dùng giá mặc định
     */
    @PostMapping("/contracts/{contractId}/renew")
    public ResponseEntity<ContractRenewalResponse> renewContract(
            Authentication authentication,
            @PathVariable Long contractId,
            @Valid @RequestBody ContractRenewalRequest request
    ) {
        User landlord = getAuthenticatedLandlord(authentication);

        if (contractId == null || contractId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID hợp đồng không hợp lệ"
            );
        }

        if (request == null || request.getTermMonths() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập thời hạn gia hạn"
            );
        }

        ContractRenewal renewal = contractService.renewContract(
        landlord,
        contractId,
        request.getTermMonths(),
        request.getRent()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ContractRenewalResponse.from(renewal));
    }

    /**
     * Xem lịch sử gia hạn của hợp đồng.
     *
     * GET /api/landlord/requests/contracts/{contractId}/renewals
     */
    @GetMapping("/contracts/{contractId}/renewals")
        public ResponseEntity<List<ContractRenewalResponse>> getRenewalHistory(
                Authentication authentication,
                @PathVariable Long contractId
        ) {
        User landlord = getAuthenticatedLandlord(authentication);

        List<ContractRenewalResponse> renewals =
                contractService.getRenewalHistory(landlord, contractId)
                        .stream()
                        .map(ContractRenewalResponse::from)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(renewals);
        }

    /**
     * Xác thực tài khoản chủ nhà đang đăng nhập.
     */
    private User getAuthenticatedLandlord(
            Authentication authentication
    ) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof User landlord)
                || landlord.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập lại"
            );
        }

        if (landlord.getRole() != User.Role.LANDLORD) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà mới được thực hiện chức năng này"
            );
        }

        return landlord;
    }
}