package com.troroom.backend.controller;

import com.troroom.backend.dto.RentalContractDetailResponse;
import com.troroom.backend.dto.RentalContractListItemResponse;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.RentalContractPdfService;
import com.troroom.backend.service.RentalContractViewService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenant/contracts")
public class TenantContractController {

    private final RentalContractViewService contractViewService;
    private final RentalContractPdfService pdfService;

    public TenantContractController(
            RentalContractViewService contractViewService,
            RentalContractPdfService pdfService
    ) {
        this.contractViewService = contractViewService;
        this.pdfService = pdfService;
    }

    @GetMapping
    public ResponseEntity<List<RentalContractListItemResponse>> getMyContracts(
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(contractViewService.getMyContracts(currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RentalContractDetailResponse> getMyContract(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(contractViewService.getMyContract(id, currentUser));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(
            @PathVariable Long id,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        byte[] pdf = pdfService.generatePdf(id, currentUser);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename("hop-dong-" + id + ".pdf")
                        .build()
        );
        headers.setContentLength(pdf.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdf);
    }
}
