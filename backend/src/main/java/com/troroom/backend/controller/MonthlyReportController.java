package com.troroom.backend.controller;

import com.troroom.backend.dto.MonthlyReportDtos;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.MonthlyReportService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/reports/monthly")
public class MonthlyReportController {

    private final MonthlyReportService service;

    public MonthlyReportController(MonthlyReportService service) {
        this.service = service;
    }

    @GetMapping
    public MonthlyReportDtos.Response getMonthlyReport(
            Authentication authentication,
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) Long buildingId
    ) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof User user)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập");
        }

        return service.getMonthlyReport(user, buildingId, from, to);
    }
}
