package com.troroom.backend.dto;

public record ServiceResponse(
        Long id,
        String name,
        long price,
        String description,
        boolean active
) {}