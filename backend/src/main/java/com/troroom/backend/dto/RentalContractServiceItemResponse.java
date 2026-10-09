package com.troroom.backend.dto;

public record RentalContractServiceItemResponse(
        Long id,
        String name,
        String calculationMethod,
        String unit,
        long price,
        boolean active
) {}
