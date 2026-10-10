package com.troroom.backend.service;

import com.troroom.backend.dto.InvoiceDtos.*;
import com.troroom.backend.entity.*;
import com.troroom.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/**
 * S3-06: Chủ nhà phát hành hoá đơn tháng cho cả toà chỉ bằng một thao tác.
 *
 * Hoá đơn gồm tiền phòng, tiền điện nước tính theo chỉ số nhân đơn giá (lấy đơn
 * giá có hiệu lực tại ngày chốt kỳ), các khoản dịch vụ cố định và khoản khoán
 * theo đầu người. Phòng chưa chốt chỉ số bị bỏ qua và liệt kê rõ. Mỗi phòng chỉ
 * có một hoá đơn cho một kỳ.
 */
@org.springframework.stereotype.Service
public class InvoiceService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int DEFAULT_DUE_DAYS = 7;

    private final BuildingRepository buildingRepository;
    private final RentalContractRepository contractRepository;
    private final MeterReadingRepository meterRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository itemRepository;
    private final RoomServiceRepository roomServiceRepository;
    private final BuildingServiceRepository buildingServiceRepository;
    private final ServiceRepository serviceRepository;
    private final RoommateRepository roommateRepository;
    private final AuditLogService auditLogService;

    public InvoiceService(
            BuildingRepository buildingRepository,
            RentalContractRepository contractRepository,
            MeterReadingRepository meterRepository,
            InvoiceRepository invoiceRepository,
            InvoiceItemRepository itemRepository,
            RoomServiceRepository roomServiceRepository,
            BuildingServiceRepository buildingServiceRepository,
            ServiceRepository serviceRepository,
            RoommateRepository roommateRepository,
            AuditLogService auditLogService) {
        this.buildingRepository = buildingRepository;
        this.contractRepository = contractRepository;
        this.meterRepository = meterRepository;
        this.invoiceRepository = invoiceRepository;
        this.itemRepository = itemRepository;
        this.roomServiceRepository = roomServiceRepository;
        this.buildingServiceRepository = buildingServiceRepository;
        this.serviceRepository = serviceRepository;
        this.roommateRepository = roommateRepository;
        this.auditLogService = auditLogService;
    }

    // ---------------------------------------------------------------
    // Phạm vi toà nhà (chủ nhà sở hữu, quản lý phụ trách)
    // ---------------------------------------------------------------

    private Building requireBuilding(User user, Long buildingId) {
        Building building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy toà nhà"));

        boolean landlord = user.getRole() == User.Role.LANDLORD
                && building.getLandlord() != null
                && building.getLandlord().getId().equals(user.getId());
        boolean manager = user.getRole() == User.Role.MANAGER
                && building.getManager() != null
                && building.getManager().getId().equals(user.getId());

        if (!landlord && !manager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thao tác hoá đơn của toà nhà này");
        }
        return building;
    }

    private static YearMonth parsePeriod(String period) {
        if (period == null || period.isBlank()) {
            return YearMonth.now(ZONE);
        }
        try {
            return YearMonth.parse(period.trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Kỳ hoá đơn không hợp lệ, cần dạng yyyy-MM");
        }
    }

    // ---------------------------------------------------------------
    // Phát hành hoá đơn hàng loạt
    // ---------------------------------------------------------------

    @Transactional
    public GenerateResponse generate(User user, GenerateRequest req) {
        if (req == null || req.buildingId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Thiếu toà nhà cần phát hành hoá đơn");
        }

        // S3-06: chỉ Chủ nhà được phát hành hoá đơn, Quản lý toà nhà chỉ xem.
        if (user.getRole() != User.Role.LANDLORD) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà được phát hành hoá đơn");
        }

        Building building = requireBuilding(user, req.buildingId());
        YearMonth period = parsePeriod(req.period());
        String key = period.toString();
        LocalDate periodEnd = period.atEndOfMonth();

        LocalDate issueDate = req.issueDate() != null ? req.issueDate() : LocalDate.now(ZONE);
        LocalDate dueDate = req.dueDate() != null ? req.dueDate() : issueDate.plusDays(DEFAULT_DUE_DAYS);
        if (dueDate.isBefore(issueDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Hạn thanh toán không được trước ngày phát hành");
        }

        List<RentalContract> contracts = contractRepository.findActiveForMeter(
                building.getId(), period.atDay(1), periodEnd);

        List<Service> activeServices = serviceRepository.findByActive(true);
        Service electricityService = findUtility(activeServices, "Điện");
        Service waterService = findUtility(activeServices, "Nước");

        List<SkippedRoom> skipped = new ArrayList<>();
        int created = 0;

        for (RentalContract contract : contracts) {
            Room room = contract.getRoom();

            if (invoiceRepository.existsByContractAndPeriod(contract, key)) {
                skipped.add(new SkippedRoom(contract.getId(), room.getId(),
                        room.getCode(), "Đã có hoá đơn trong kỳ"));
                continue;
            }

            Optional<MeterReading> reading = meterRepository.findByContractAndPeriod(contract, key);
            if (reading.isEmpty()) {
                skipped.add(new SkippedRoom(contract.getId(), room.getId(),
                        room.getCode(), "Chưa chốt chỉ số điện nước"));
                continue;
            }
            MeterReading meter = reading.get();

            int occupants = 1 + (int) roommateRepository
                    .countByRoomIdAndStatus(room.getId(), Roommate.Status.ACTIVE);

            List<InvoiceCalculator.PricedService> services = new ArrayList<>();
            Integer elecPrev = null;
            Integer elec = null;
            long elecPrice = 0;
            String elecUnit = "kWh";
            Integer waterPrev = null;
            Integer water = null;
            long waterPrice = 0;
            String waterUnit = "m³";

            if (electricityService != null) {
                ServiceCfg cfg = resolveCfg(room, building, electricityService, periodEnd);
                if (cfg.method() == Service.CalculationMethod.BY_PERSON) {
                    services.add(new InvoiceCalculator.PricedService(
                            "Tiền điện", electricityService.getUnit(),
                            Service.CalculationMethod.BY_PERSON, cfg.price()));
                } else {
                    elecPrev = meter.getElectricityPrev();
                    elec = meter.getElectricity();
                    elecPrice = cfg.price();
                    elecUnit = electricityService.getUnit();
                }
            }

            if (waterService != null) {
                ServiceCfg cfg = resolveCfg(room, building, waterService, periodEnd);
                if (cfg.method() == Service.CalculationMethod.BY_PERSON) {
                    services.add(new InvoiceCalculator.PricedService(
                            "Tiền nước", waterService.getUnit(),
                            Service.CalculationMethod.BY_PERSON, cfg.price()));
                } else {
                    waterPrev = meter.getWaterPrev();
                    water = meter.getWater();
                    waterPrice = cfg.price();
                    waterUnit = waterService.getUnit();
                }
            }

            for (RoomService rs : roomServiceRepository.findByRoom(room)) {
                Service s = rs.getService();
                if (s == null) {
                    continue;
                }
                if (electricityService != null && s.getId().equals(electricityService.getId())) {
                    continue;
                }
                if (waterService != null && s.getId().equals(waterService.getId())) {
                    continue;
                }
                if (s.getCalculationMethod() == Service.CalculationMethod.BY_METER) {
                    continue;
                }
                services.add(new InvoiceCalculator.PricedService(
                        s.getName(), s.getUnit(), s.getCalculationMethod(), rs.getPrice()));
            }

            InvoiceCalculator.Result result = InvoiceCalculator.compute(
                    contract.getRent(),
                    elecPrev, elec, elecPrice, elecUnit,
                    waterPrev, water, waterPrice, waterUnit,
                    occupants,
                    services);

            Invoice invoice = new Invoice();
            invoice.setInvoiceCode(generateInvoiceCode());
            invoice.setContract(contract);
            invoice.setRoom(room);
            invoice.setPeriod(key);
            invoice.setRentAmount(contract.getRent());
            invoice.setTotalAmount(result.total());
            invoice.setStatus(Invoice.Status.ISSUED);
            invoice.setIssueDate(issueDate);
            invoice.setDueDate(dueDate);
            invoice.setCreatedAt(LocalDateTime.now(ZONE));
            Invoice saved = invoiceRepository.save(invoice);

            for (InvoiceCalculator.Line line : result.lines()) {
                InvoiceItem item = new InvoiceItem();
                item.setInvoice(saved);
                item.setLabel(line.label());
                item.setType(line.type());
                item.setQuantity(line.quantity());
                item.setUnit(line.unit());
                item.setUnitPrice(line.unitPrice());
                item.setAmount(line.amount());
                item.setPreviousReading(line.previousReading());
                item.setCurrentReading(line.currentReading());
                itemRepository.save(item);
            }

            auditLogService.log(user, "CREATE", "Invoice", saved.getId(), null,
                    Map.of("invoiceCode", saved.getInvoiceCode(), "roomCode", room.getCode(),
                            "period", key, "totalAmount", saved.getTotalAmount()));
            created++;
        }

        return new GenerateResponse(building.getId(), key, contracts.size(), created,
                List.copyOf(skipped));
    }

    // ---------------------------------------------------------------
    // Tra cứu hoá đơn
    // ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<InvoiceResponse> list(User user, Long buildingId, String period) {
        Building building = requireBuilding(user, buildingId);
        String key = parsePeriod(period).toString();

        List<Invoice> invoices = invoiceRepository.findByBuildingAndPeriod(building.getId(), key);
        List<InvoiceResponse> result = new ArrayList<>();
        for (Invoice invoice : invoices) {
            // Danh sách chỉ hiển thị phần đầu; chi tiết lấy riêng qua GET /api/invoices/{id}.
            result.add(toResponse(invoice, List.of()));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public InvoiceResponse detail(User user, Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy hoá đơn"));

        RentalContract contract = invoice.getContract();
        boolean isTenant = user.getRole() == User.Role.TENANT
                && contract != null && contract.getTenant() != null
                && contract.getTenant().getId().equals(user.getId());

        if (!isTenant) {
            requireBuilding(user, invoice.getRoom().getBuilding().getId());
        }

        return toResponse(invoice, itemRepository.findByInvoiceOrderByIdAsc(invoice));
    }

    private InvoiceResponse toResponse(Invoice invoice, List<InvoiceItem> items) {
        RentalContract contract = invoice.getContract();
        Room room = invoice.getRoom();

        List<ItemResponse> itemResponses = items.stream()
                .map(i -> new ItemResponse(
                        i.getLabel(),
                        i.getType().name(),
                        i.getQuantity(),
                        i.getUnit(),
                        i.getUnitPrice(),
                        i.getAmount(),
                        i.getPreviousReading(),
                        i.getCurrentReading()))
                .toList();

        return new InvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceCode(),
                contract != null ? contract.getId() : null,
                contract != null ? contract.getContractCode() : null,
                room != null ? room.getId() : null,
                room != null ? room.getCode() : null,
                contract != null && contract.getTenant() != null
                        ? contract.getTenant().getName() : null,
                invoice.getPeriod(),
                invoice.getRentAmount(),
                invoice.getTotalAmount(),
                invoice.getStatus().name(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                itemResponses);
    }

    // ---------------------------------------------------------------
    // Tra cứu đơn giá
    // ---------------------------------------------------------------

    private record ServiceCfg(Service.CalculationMethod method, long price) {
    }

    /**
     * Đơn giá của một dịch vụ áp dụng cho phòng tại ngày chốt kỳ.
     * Ưu tiên cấu hình toà nhà có hiệu lực, rồi đơn giá riêng của phòng,
     * cuối cùng là đơn giá chung của dịch vụ.
     */
    private ServiceCfg resolveCfg(Room room, Building building, Service service, LocalDate date) {
        Optional<BuildingService> buildingCfg = buildingServiceRepository
                .findByBuildingAndServiceOrderByEffectiveFromDesc(building, service)
                .stream()
                .filter(b -> !b.getEffectiveFrom().isAfter(date))
                .findFirst();
        if (buildingCfg.isPresent()) {
            return new ServiceCfg(buildingCfg.get().getCalculationMethod(),
                    buildingCfg.get().getPrice());
        }

        Optional<RoomService> roomCfg = roomServiceRepository.findByRoomAndService(room, service);
        if (roomCfg.isPresent()) {
            return new ServiceCfg(service.getCalculationMethod(), roomCfg.get().getPrice());
        }

        return new ServiceCfg(service.getCalculationMethod(), service.getPrice());
    }

    private Service findUtility(List<Service> services, String name) {
        return services.stream()
                .filter(s -> s.getName() != null && s.getName().trim().equalsIgnoreCase(name))
                .findFirst()
                .orElse(null);
    }

    /** Sinh mã hoá đơn dạng INV-yyyy-xxxx. */
    private String generateInvoiceCode() {
        int year = Year.now().getValue();
        for (int i = 0; i < 100; i++) {
            int number = ThreadLocalRandom.current().nextInt(1, 100000);
            String code = String.format("INV-%d-%05d", year, number);
            if (!invoiceRepository.existsByInvoiceCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Không thể tạo mã hoá đơn");
    }
}
