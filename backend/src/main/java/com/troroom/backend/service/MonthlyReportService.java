package com.troroom.backend.service;

import com.troroom.backend.dto.MonthlyReportDtos;
import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.InvoiceRepository;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RoomRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class MonthlyReportService {

    private final BuildingRepository buildingRepository;
    private final InvoiceRepository invoiceRepository;
    private final RentalContractRepository contractRepository;
    private final RoomRepository roomRepository;

    public MonthlyReportService(
            BuildingRepository buildingRepository,
            InvoiceRepository invoiceRepository,
            RentalContractRepository contractRepository,
            RoomRepository roomRepository
    ) {
        this.buildingRepository = buildingRepository;
        this.invoiceRepository = invoiceRepository;
        this.contractRepository = contractRepository;
        this.roomRepository = roomRepository;
    }

    @Transactional(readOnly = true)
    public MonthlyReportDtos.Response getMonthlyReport(
            User currentUser,
            Long buildingId,
            String fromPeriod,
            String toPeriod
    ) {
        List<Building> availableBuildings = accessibleBuildings(currentUser);
        List<Building> reportBuildings = availableBuildings;
        YearMonth from = parsePeriod(fromPeriod);
        YearMonth to = parsePeriod(toPeriod);

        if (from.isAfter(to)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tháng bắt đầu không được sau tháng kết thúc");
        }
        if (from.until(to, java.time.temporal.ChronoUnit.MONTHS) >= 12) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mỗi lần xem tối đa 12 tháng");
        }

        if (buildingId != null) {
            Building selectedBuilding = availableBuildings.stream()
                    .filter(building -> building.getId().equals(buildingId))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Bạn không có quyền xem báo cáo của tòa nhà này"));
            reportBuildings = List.of(selectedBuilding);
        }

        List<Long> buildingIds = reportBuildings.stream()
                .map(Building::getId)
                .toList();
        List<MonthlyReportDtos.BuildingOption> buildingOptions =
                availableBuildings.stream()
                        .map(building -> new MonthlyReportDtos.BuildingOption(
                                building.getId(),
                                building.getName()))
                        .toList();

        YearMonth currentMonth = YearMonth.now(
                ZoneId.of("Asia/Ho_Chi_Minh"));
        YearMonth recentFrom = currentMonth.minusMonths(5);
        List<MonthlyReportDtos.RevenueMonth> recentMonths =
                emptyRevenueMonths(recentFrom, currentMonth);

        if (buildingIds.isEmpty()) {
            return new MonthlyReportDtos.Response(
                    buildingOptions,
                    emptyMonths(from, to),
                    false,
                    recentMonths,
                    false);
        }

        Map<String, MonthlyReportDtos.InvoiceAggregate> invoiceByPeriod =
                aggregateInvoices(buildingIds, from, to);
        Map<String, MonthlyReportDtos.InvoiceAggregate> recentInvoiceByPeriod;
        if (!recentFrom.isBefore(from) && !currentMonth.isAfter(to)) {
            recentInvoiceByPeriod = invoiceByPeriod;
        } else {
            recentInvoiceByPeriod =
                    aggregateInvoices(buildingIds, recentFrom, currentMonth);
        }
        recentMonths = recentRevenueMonths(
                recentFrom, currentMonth, recentInvoiceByPeriod);

        LocalDate rangeStart = from.atDay(1);
        LocalDate rangeEnd = to.atEndOfMonth();
        List<RentalContract> contracts =
                contractRepository.findForMonthlyOccupancy(
                        buildingIds, rangeStart, rangeEnd);
        List<Room.Status> rentableStatuses = List.of(
                Room.Status.EMPTY,
                Room.Status.DEPOSITED,
                Room.Status.RENTED);
        Set<Room.Status> rentableStatusSet = Set.copyOf(rentableStatuses);
        Map<Long, Long> roomsByBuilding =
                roomRepository.countRentableByBuildingIds(
                                buildingIds, rentableStatuses)
                        .stream()
                        .collect(java.util.stream.Collectors.toMap(
                                row -> ((Number) row[0]).longValue(),
                                row -> ((Number) row[1]).longValue()));
        long totalRooms = roomsByBuilding.values().stream()
                .mapToLong(Long::longValue).sum();

        List<MonthlyReportDtos.MonthSummary> summaries =
                new ArrayList<>();
        for (YearMonth month = from; !month.isAfter(to); month = month.plusMonths(1)) {
            LocalDate monthEnd = month.atEndOfMonth();
            Set<Long> occupiedRoomIds = new HashSet<>();
            for (RentalContract contract : contracts) {
                LocalDate actualEnd = contract.getTerminatedAt() != null
                        && contract.getTerminatedAt().isBefore(contract.getEndDate())
                        ? contract.getTerminatedAt()
                        : contract.getEndDate();
                if (rentableStatusSet.contains(contract.getRoom().getStatus())
                        && !contract.getStartDate().isAfter(monthEnd)
                        && !actualEnd.isBefore(monthEnd)) {
                    occupiedRoomIds.add(contract.getRoom().getId());
                }
            }

            MonthlyReportDtos.InvoiceAggregate invoice =
                    invoiceByPeriod.get(month.toString());
            long issued = invoice == null ? 0 : invoice.issuedAmount();
            long collected = invoice == null ? 0 : invoice.collectedAmount();
            long outstanding = invoice == null ? 0 : invoice.outstandingAmount();

            summaries.add(new MonthlyReportDtos.MonthSummary(
                    month.toString(),
                    issued,
                    collected,
                    outstanding,
                    percentage(collected, issued),
                    occupiedRoomIds.size(),
                    totalRooms,
                    percentage(occupiedRoomIds.size(), totalRooms)));
        }

        return new MonthlyReportDtos.Response(
                buildingOptions,
                summaries,
                !invoiceByPeriod.isEmpty(),
                recentMonths,
                !recentInvoiceByPeriod.isEmpty());
    }

    private Map<String, MonthlyReportDtos.InvoiceAggregate> aggregateInvoices(
            List<Long> buildingIds,
            YearMonth from,
            YearMonth to
    ) {
        Map<String, MonthlyReportDtos.InvoiceAggregate> aggregates =
                new HashMap<>();
        invoiceRepository.aggregateForMonthlyReport(
                        buildingIds,
                        from.toString(),
                        to.toString(),
                        List.of(
                                com.troroom.backend.entity.Invoice.Status.ISSUED,
                                com.troroom.backend.entity.Invoice.Status.PARTIALLY_PAID,
                                com.troroom.backend.entity.Invoice.Status.PAID))
                .forEach(row -> {
                    MonthlyReportDtos.InvoiceAggregate aggregate =
                            new MonthlyReportDtos.InvoiceAggregate(
                                    (String) row[0],
                                    ((Number) row[1]).longValue(),
                                    ((Number) row[2]).longValue(),
                                    ((Number) row[3]).longValue());
                    aggregates.put(aggregate.period(), aggregate);
                });
        return aggregates;
    }

    private List<MonthlyReportDtos.RevenueMonth> recentRevenueMonths(
            YearMonth from,
            YearMonth to,
            Map<String, MonthlyReportDtos.InvoiceAggregate> invoiceByPeriod
    ) {
        List<MonthlyReportDtos.RevenueMonth> recentMonths = new ArrayList<>();
        for (YearMonth month = from; !month.isAfter(to); month = month.plusMonths(1)) {
            MonthlyReportDtos.InvoiceAggregate invoice =
                    invoiceByPeriod.get(month.toString());
            recentMonths.add(new MonthlyReportDtos.RevenueMonth(
                    month.toString(),
                    invoice == null ? 0 : invoice.issuedAmount(),
                    invoice == null ? 0 : invoice.collectedAmount()));
        }
        return recentMonths;
    }

    private List<MonthlyReportDtos.RevenueMonth> emptyRevenueMonths(
            YearMonth from,
            YearMonth to
    ) {
        return recentRevenueMonths(from, to, Map.of());
    }

    private List<Building> accessibleBuildings(User currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập");
        }
        return switch (currentUser.getRole()) {
            case LANDLORD -> buildingRepository.findByLandlordOrderByIdAsc(currentUser);
            case MANAGER -> buildingRepository.findByManager(currentUser);
            case ADMIN -> buildingRepository.findAll();
            default -> throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà hoặc quản lý mới được xem báo cáo");
        };
    }

    private YearMonth parsePeriod(String period) {
        try {
            return YearMonth.parse(period);
        } catch (DateTimeException | NullPointerException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tháng phải có định dạng yyyy-MM");
        }
    }

    private List<MonthlyReportDtos.MonthSummary> emptyMonths(
            YearMonth from,
            YearMonth to
    ) {
        List<MonthlyReportDtos.MonthSummary> summaries = new ArrayList<>();
        for (YearMonth month = from; !month.isAfter(to); month = month.plusMonths(1)) {
            summaries.add(new MonthlyReportDtos.MonthSummary(
                    month.toString(), 0, 0, 0, 0, 0, 0, 0));
        }
        return summaries;
    }

    private double percentage(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0;
        }
        return BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
