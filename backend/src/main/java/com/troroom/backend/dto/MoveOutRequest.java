package com.troroom.backend.dto;

import java.time.LocalDate;

public record MoveOutRequest(
        LocalDate moveOutDate,
        String note
) {}
