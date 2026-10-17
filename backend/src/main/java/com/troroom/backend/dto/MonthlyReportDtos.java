package com.troroom.backend.dto;

import java.util.List;

public final class MonthlyReportDtos {

    private MonthlyReportDtos() {
    }

    public record BuildingOption(Long id, String name) {
    }

    public record MonthSummary(
            String period,
            long issuedAmount,
            long collectedAmount,
            long outstandingAmount,
            double collectionRatePercent,
            long occupiedRooms,
            long totalRooms,
            double occupancyRatePercent
    ) {
    }

    public record Response(
            List<BuildingOption> buildings,
            List<MonthSummary> months
    ) {
    }

    public record InvoiceAggregate(
            String period,
            long issuedAmount,
            long collectedAmount,
            long outstandingAmount
    ) {
    }
}
