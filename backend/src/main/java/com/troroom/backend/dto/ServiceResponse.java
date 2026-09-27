package com.troroom.backend.dto;

import com.troroom.backend.entity.Service.CalculationMethod;

public record ServiceResponse(
        Long id,
        String name,
        CalculationMethod calculationMethod,
        String unit,
        long price,
        String description,
        boolean active
) {}