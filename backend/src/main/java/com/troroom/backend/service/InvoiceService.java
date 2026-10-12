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

@org.springframework.stereotype.Service
public class InvoiceService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int DEFAULT_DUE_DAYS = 7;

    private final BuildingRepository buildingRepository;
    private final RentalContractRepository contractRepository;
    private final ContractRenewalRepository renewalRepository;
    private final MeterReadingRepository meterRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository itemRepository;
    private final RoomServiceRepository roomServiceRepository;
    private final BuildingServiceRepository buildingServiceRepository;
    private final ServiceRepository serviceRepository;
    private final RoommateRepository roommateRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public InvoiceService(
            BuildingRepository buildingRepository,
            RentalContractRepository contractRepository,
            ContractRenewalRepository renewalRepository,
            MeterReadingRepository meterRepository,
            InvoiceRepository invoiceRepository,
            InvoiceItemRepository itemRepository,
            RoomServiceRepository roomServiceRepository,
            BuildingServiceRepository buildingServiceRepository,
            ServiceRepository serviceRepository,
            RoommateRepository roommateRepository,
            AuditLogService auditLogService,
            NotificationService notificationService
    ) {
        this.buildingRepository = buildingRepository;
        this.contractRepository = contractRepository;
        this.renewalRepository = renewalRepository;
        this.meterRepository = meterRepository;
        this.invoiceRepository = invoiceRepository;
        this.itemRepository = itemRepository;
        this.roomServiceRepository = roomServiceRepository;
        this.buildingServiceRepository = buildingServiceRepository;
        this.serviceRepository = serviceRepository;
        this.roommateRepository = roommateRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    // ---------------------------------------------------------------
    // Kiểm tra quyền truy cập tòa nhà
    // ---------------------------------------------------------------

    private Building requireBuilding(User user, Long buildingId) {
        if (user == null || user.getId() == null || buildingId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thông tin người dùng hoặc tòa nhà không hợp lệ"
            );
        }

        Building building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy tòa nhà"
                ));

        boolean landlord = user.getRole() == User.Role.LANDLORD
                && building.getLandlord() != null
                && building.getLandlord().getId().equals(user.getId());

        boolean manager = user.getRole() == User.Role.MANAGER
                && building.getManager() != null
                && building.getManager().getId().equals(user.getId());

        if (!landlord && !manager) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thao tác hóa đơn của tòa nhà này"
            );
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
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Kỳ hóa đơn không hợp lệ, cần dạng yyyy-MM"
            );
        }
    }

    // ---------------------------------------------------------------
    // Chọn giá thuê áp dụng cho kỳ hóa đơn
    // ---------------------------------------------------------------

    /**
     * Chọn giá thuê theo thời gian hiệu lực của từng lần gia hạn.
     *
     * Quy tắc:
     * - Nếu kỳ hóa đơn giao với giai đoạn gia hạn, dùng giá thuê của
     *   lần gia hạn đó.
     * - Nếu kỳ hóa đơn không thuộc giai đoạn gia hạn, dùng giá gốc.
     * - Không sửa các hóa đơn đã được tạo trước đó.
     *
     * Nếu một kỳ hóa đơn giao với nhiều giai đoạn giá khác nhau,
     * áp dụng giá của giai đoạn có ngày bắt đầu muộn nhất trong kỳ.
     */
    private long resolveRentForPeriod(
            RentalContract contract,
            YearMonth period
    ) {
        if (contract == null || contract.getRent() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giá thuê hợp đồng không hợp lệ"
            );
        }

        LocalDate periodStart = period.atDay(1);
        LocalDate periodEnd = period.atEndOfMonth();

        List<ContractRenewal> renewals =
                renewalRepository.findByContract_IdOrderByStartDateAsc(
                        contract.getId()
                );

        ContractRenewal applicableRenewal = null;

        for (ContractRenewal renewal : renewals) {
            if (renewal.getStartDate() == null
                    || renewal.getEndDate() == null) {
                continue;
            }

            boolean overlapsPeriod =
                    !renewal.getStartDate().isAfter(periodEnd)
                    && !renewal.getEndDate().isBefore(periodStart);

            if (overlapsPeriod) {
                if (applicableRenewal == null
                        || renewal.getStartDate().isAfter(
                                applicableRenewal.getStartDate())) {
                    applicableRenewal = renewal;
                }
            }
        }

        if (applicableRenewal == null) {
            return contract.getRent();
        }

        if (applicableRenewal.getRent() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giá thuê trong lịch sử gia hạn không hợp lệ"
            );
        }

        return applicableRenewal.getRent();
    }

    // ---------------------------------------------------------------
    // Tạo hóa đơn hàng loạt ở trạng thái DRAFT
    // ---------------------------------------------------------------

    @Transactional
    public GenerateResponse generate(User user, GenerateRequest req) {
        if (req == null || req.buildingId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thiếu tòa nhà cần tạo hóa đơn"
            );
        }

        if (user == null || user.getRole() != User.Role.LANDLORD) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà được tạo hóa đơn"
            );
        }

        Building building = requireBuilding(user, req.buildingId());
        YearMonth period = parsePeriod(req.period());
        String key = period.toString();

        LocalDate periodEnd = period.atEndOfMonth();

        LocalDate issueDate = req.issueDate() != null
                ? req.issueDate()
                : LocalDate.now(ZONE);

        LocalDate dueDate = req.dueDate() != null
                ? req.dueDate()
                : issueDate.plusDays(DEFAULT_DUE_DAYS);

        if (dueDate.isBefore(issueDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hạn thanh toán không được trước ngày phát hành"
            );
        }

        List<RentalContract> contracts =
                contractRepository.findActiveForMeter(
                        building.getId(),
                        period.atDay(1),
                        periodEnd
                );

        List<com.troroom.backend.entity.Service> activeServices =
                serviceRepository.findByActive(true);

        com.troroom.backend.entity.Service electricityService =
                findUtility(activeServices, "Điện");

        com.troroom.backend.entity.Service waterService =
                findUtility(activeServices, "Nước");

        List<SkippedRoom> skipped = new ArrayList<>();
        int created = 0;

        for (RentalContract contract : contracts) {
            Room room = contract.getRoom();

            if (room == null) {
                skipped.add(new SkippedRoom(
                        contract.getId(),
                        null,
                        null,
                        "Hợp đồng chưa được liên kết với phòng"
                ));
                continue;
            }

            if (invoiceRepository.existsByContractAndPeriodAndStatusNot(
                    contract,
                    key,
                    Invoice.Status.CANCELLED
            )) {
                skipped.add(new SkippedRoom(
                        contract.getId(),
                        room.getId(),
                        room.getCode(),
                        "Đã có hóa đơn chưa bị hủy trong kỳ"
                ));
                continue;
            }

            Optional<MeterReading> reading =
                    meterRepository.findByContractAndPeriod(contract, key);

            if (reading.isEmpty()) {
                skipped.add(new SkippedRoom(
                        contract.getId(),
                        room.getId(),
                        room.getCode(),
                        "Chưa chốt chỉ số điện nước"
                ));
                continue;
            }

            MeterReading meter = reading.get();

            int occupants = 1 + (int) roommateRepository
                    .countByRoomIdAndStatus(
                            room.getId(),
                            Roommate.Status.ACTIVE
                    );

            List<InvoiceCalculator.PricedService> services =
                    new ArrayList<>();

            Integer elecPrev = null;
            Integer elec = null;
            long elecPrice = 0;
            String elecUnit = "kWh";

            Integer waterPrev = null;
            Integer water = null;
            long waterPrice = 0;
            String waterUnit = "m³";

            if (electricityService != null) {
                ServiceCfg cfg = resolveCfg(
                        room,
                        building,
                        electricityService,
                        periodEnd
                );

                if (cfg.method()
                        == com.troroom.backend.entity.Service.CalculationMethod.BY_PERSON) {
                    services.add(new InvoiceCalculator.PricedService(
                            "Tiền điện",
                            electricityService.getUnit(),
                            cfg.method(),
                            cfg.price()
                    ));
                } else {
                    elecPrev = meter.getElectricityPrev();
                    elec = meter.getElectricity();
                    elecPrice = cfg.price();
                    elecUnit = electricityService.getUnit();
                }
            }

            if (waterService != null) {
                ServiceCfg cfg = resolveCfg(
                        room,
                        building,
                        waterService,
                        periodEnd
                );

                if (cfg.method()
                        == com.troroom.backend.entity.Service.CalculationMethod.BY_PERSON) {
                    services.add(new InvoiceCalculator.PricedService(
                            "Tiền nước",
                            waterService.getUnit(),
                            cfg.method(),
                            cfg.price()
                    ));
                } else {
                    waterPrev = meter.getWaterPrev();
                    water = meter.getWater();
                    waterPrice = cfg.price();
                    waterUnit = waterService.getUnit();
                }
            }

            for (RoomService rs : roomServiceRepository.findByRoom(room)) {
                com.troroom.backend.entity.Service service = rs.getService();

                if (service == null) {
                    continue;
                }

                if (electricityService != null
                        && service.getId().equals(electricityService.getId())) {
                    continue;
                }

                if (waterService != null
                        && service.getId().equals(waterService.getId())) {
                    continue;
                }

                if (service.getCalculationMethod()
                        == com.troroom.backend.entity.Service.CalculationMethod.BY_METER) {
                    continue;
                }

                services.add(new InvoiceCalculator.PricedService(
                        service.getName(),
                        service.getUnit(),
                        service.getCalculationMethod(),
                        rs.getPrice()
                ));
            }

            // Chọn giá thuê theo kỳ trước khi tính tổng tiền.
            long rentForPeriod = resolveRentForPeriod(contract, period);

            InvoiceCalculator.Result result = InvoiceCalculator.compute(
                    rentForPeriod,
                    elecPrev,
                    elec,
                    elecPrice,
                    elecUnit,
                    waterPrev,
                    water,
                    waterPrice,
                    waterUnit,
                    occupants,
                    services
            );

            Invoice invoice = new Invoice();
            invoice.setInvoiceCode(generateInvoiceCode());
            invoice.setContract(contract);
            invoice.setRoom(room);
            invoice.setPeriod(key);

            // Lưu snapshot giá thuê tại thời điểm tạo hóa đơn.
            invoice.setRentAmount(rentForPeriod);
            invoice.setTotalAmount(result.total());
            invoice.setStatus(Invoice.Status.DRAFT);
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

            auditLogService.log(
                    user,
                    "CREATE",
                    "Invoice",
                    saved.getId(),
                    null,
                    Map.of(
                            "invoiceCode", saved.getInvoiceCode(),
                            "roomCode", room.getCode(),
                            "period", key,
                            "rentAmount", rentForPeriod,
                            "totalAmount", saved.getTotalAmount()
                    )
            );

            created++;
        }

        return new GenerateResponse(
                building.getId(),
                key,
                contracts.size(),
                created,
                List.copyOf(skipped)
        );
    }

    // ---------------------------------------------------------------
    // Danh sách hóa đơn của tòa nhà
    // ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<InvoiceResponse> list(
            User user,
            Long buildingId,
            String period
    ) {
        Building building = requireBuilding(user, buildingId);
        String key = parsePeriod(period).toString();

        List<Invoice> invoices =
                invoiceRepository.findByBuildingAndPeriod(
                        building.getId(),
                        key
                );

        List<InvoiceResponse> result = new ArrayList<>();

        for (Invoice invoice : invoices) {
            result.add(toResponse(invoice, List.of()));
        }

        return result;
    }

    // ---------------------------------------------------------------
    // Danh sách hóa đơn khách thuê
    // Chỉ trả về hóa đơn đã phát hành
    // ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<InvoiceResponse> listForTenant(User user) {
        if (user == null || user.getRole() != User.Role.TENANT) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ khách thuê mới được xem danh sách hóa đơn này"
            );
        }

        List<Invoice> invoices =
                invoiceRepository.findByTenant(user, Invoice.Status.ISSUED);

        List<InvoiceResponse> result = new ArrayList<>();

        for (Invoice invoice : invoices) {
            result.add(toResponse(invoice, List.of()));
        }

        return result;
    }

    // ---------------------------------------------------------------
    // Chi tiết hóa đơn
    // ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public InvoiceResponse detail(User user, Long invoiceId) {
        if (user == null || invoiceId == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập"
            );
        }

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hóa đơn"
                ));

        RentalContract contract = invoice.getContract();

        boolean isTenant = user.getRole() == User.Role.TENANT
                && contract != null
                && contract.getTenant() != null
                && contract.getTenant().getId().equals(user.getId());

        if (isTenant) {
            if (invoice.getStatus() != Invoice.Status.ISSUED) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hóa đơn"
                );
            }
        } else {
            if (invoice.getRoom() == null
                    || invoice.getRoom().getBuilding() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Hóa đơn chưa được liên kết với tòa nhà"
                );
            }

            requireBuilding(
                    user,
                    invoice.getRoom().getBuilding().getId()
            );
        }

        return toResponse(
                invoice,
                itemRepository.findByInvoiceOrderByIdAsc(invoice)
        );
    }

    // ---------------------------------------------------------------
    // Chỉnh sửa hóa đơn nháp
    // ---------------------------------------------------------------

    @Transactional
    public InvoiceResponse edit(
            User user,
            Long invoiceId,
            EditInvoiceRequest req
    ) {
        if (user == null || user.getRole() != User.Role.LANDLORD) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà được chỉnh sửa hóa đơn"
            );
        }

        if (req == null
                || req.items() == null
                || req.reason() == null
                || req.reason().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cần cung cấp danh sách khoản mục và lý do chỉnh sửa"
            );
        }

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hóa đơn"
                ));

        requireBuilding(
                user,
                invoice.getRoom().getBuilding().getId()
        );

        if (invoice.getStatus() != Invoice.Status.DRAFT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ được chỉnh sửa hóa đơn DRAFT"
            );
        }

        List<InvoiceItem> oldItems =
                itemRepository.findByInvoiceOrderByIdAsc(invoice);

        InvoiceResponse before = toResponse(invoice, oldItems);

        List<Long> retainedIds = new ArrayList<>();
        long total = 0;
        Long rentAmount = null;
        int rentCount = 0;

        for (EditItemRequest input : req.items()) {
            if (input == null
                    || input.label() == null
                    || input.label().isBlank()
                    || input.type() == null
                    || input.unit() == null
                    || input.unit().isBlank()
                    || input.quantity() < 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Thông tin khoản mục không hợp lệ"
                );
            }

            InvoiceItem.Type type;

            try {
                type = InvoiceItem.Type.valueOf(
                        input.type().trim().toUpperCase()
                );
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Loại khoản mục không hợp lệ"
                );
            }

            if (type == InvoiceItem.Type.ADJUSTMENT
                    && (input.note() == null || input.note().isBlank())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Khoản điều chỉnh phải có ghi chú"
                );
            }

            if (type != InvoiceItem.Type.ADJUSTMENT
                    && input.unitPrice() < 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Đơn giá chỉ được âm với khoản điều chỉnh"
                );
            }

            InvoiceItem item;

            if (input.id() != null) {
                if (retainedIds.contains(input.id())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Khoản mục bị gửi trùng ID"
                    );
                }

                item = oldItems.stream()
                        .filter(old -> old.getId().equals(input.id()))
                        .findFirst()
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "Khoản mục không thuộc hóa đơn này"
                        ));

                retainedIds.add(item.getId());
            } else {
                item = new InvoiceItem();
                item.setInvoice(invoice);
            }

            int quantity = input.quantity();

            if (type == InvoiceItem.Type.ELECTRICITY
                    || type == InvoiceItem.Type.WATER) {
                Integer previous = input.previousReading();
                Integer current = input.currentReading();

                if (previous == null
                        || current == null
                        || previous < 0
                        || current < previous) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Chỉ số điện nước không hợp lệ"
                    );
                }

                quantity = current - previous;

                // S3-08: ghi ngược chỉ số về bảng meter_readings để
                // hoá đơn và màn hình nhập chỉ số luôn khớp nhau.
                syncMeterReading(invoice, type, previous, current);
            }

            long amount;

            try {
                amount = Math.multiplyExact(
                        (long) quantity,
                        input.unitPrice()
                );

                total = Math.addExact(total, amount);
            } catch (ArithmeticException e) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Số tiền vượt quá giới hạn cho phép"
                );
            }

            item.setLabel(input.label().trim());
            item.setType(type);
            item.setQuantity(quantity);
            item.setUnit(input.unit().trim());
            item.setUnitPrice(input.unitPrice());
            item.setAmount(amount);
            item.setPreviousReading(input.previousReading());
            item.setCurrentReading(input.currentReading());
            item.setNote(
                    input.note() == null || input.note().isBlank()
                            ? null
                            : input.note().trim()
            );

            itemRepository.save(item);

            if (type == InvoiceItem.Type.RENT) {
                rentCount++;
                rentAmount = amount;
            }
        }

        if (rentCount != 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hóa đơn phải có đúng một khoản tiền phòng"
            );
        }

        for (InvoiceItem oldItem : oldItems) {
            if (!retainedIds.contains(oldItem.getId())) {
                itemRepository.delete(oldItem);
            }
        }

        invoice.setRentAmount(rentAmount);
        invoice.setTotalAmount(total);
        invoiceRepository.save(invoice);

        itemRepository.flush();

        List<InvoiceItem> updatedItems =
                itemRepository.findByInvoiceOrderByIdAsc(invoice);

        InvoiceResponse after = toResponse(invoice, updatedItems);

        auditLogService.log(
                user,
                "UPDATE",
                "Invoice",
                invoice.getId(),
                before,
                Map.of(
                        "reason", req.reason().trim(),
                        "invoice", after
                )
        );

        return after;
    }

    /**
     * Ghi ngược chỉ số điện/nước vừa sửa trong hoá đơn về bản ghi chỉ số gốc,
     * để màn hình nhập chỉ số và chỉ số cũ của kỳ sau luôn khớp với hoá đơn.
     */
    private void syncMeterReading(
            Invoice invoice,
            InvoiceItem.Type type,
            int previous,
            int current
    ) {
        RentalContract contract = invoice.getContract();
        if (contract == null) {
            return;
        }

        MeterReading reading = meterRepository
                .findByContractAndPeriod(contract, invoice.getPeriod())
                .orElse(null);

        if (reading == null) {
            return;
        }

        // Không cho sửa kỳ cũ khi đã có kỳ sau, tránh làm lệch chuỗi chỉ số.
        if (meterRepository.existsByContractAndPeriodGreaterThan(
                contract, invoice.getPeriod())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đã có chỉ số của kỳ sau, không thể sửa chỉ số kỳ "
                            + invoice.getPeriod()
            );
        }

        if (type == InvoiceItem.Type.ELECTRICITY) {
            reading.setElectricityPrev(previous);
            reading.setElectricity(current);
        } else {
            reading.setWaterPrev(previous);
            reading.setWater(current);
        }

        meterRepository.save(reading);
    }

    // ---------------------------------------------------------------
    // Phát hành hóa đơn nháp
    // ---------------------------------------------------------------

    @Transactional
    public InvoiceResponse issue(User user, Long invoiceId) {
        if (user == null || user.getRole() != User.Role.LANDLORD) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà được phát hành hóa đơn"
            );
        }

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hóa đơn"
                ));

        requireBuilding(
                user,
                invoice.getRoom().getBuilding().getId()
        );

        if (invoice.getStatus() != Invoice.Status.DRAFT) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ được phát hành hóa đơn nháp"
            );
        }

        List<InvoiceItem> items =
                itemRepository.findByInvoiceOrderByIdAsc(invoice);

        InvoiceResponse before = toResponse(invoice, items);

        invoice.setStatus(Invoice.Status.ISSUED);
        invoiceRepository.save(invoice);

        // Thông báo là thao tác phụ: nạp sẵn dữ liệu (trong transaction hiện
        // tại) rồi gọi sang transaction riêng; nếu lỗi cũng không chặn việc
        // phát hành hóa đơn.
        try {
            notificationService.notifyInvoiceIssued(
                    invoice,
                    invoice.getContract().getTenant(),
                    invoice.getRoom().getBuilding().getLandlord()
            );
        } catch (Exception ignored) {
            // Bỏ qua lỗi tạo thông báo.
        }

        InvoiceResponse after = toResponse(invoice, items);

        auditLogService.log(
                user,
                "ISSUE",
                "Invoice",
                invoice.getId(),
                before,
                after
        );

        return after;
    }

    // ---------------------------------------------------------------
    // Hủy hóa đơn đã phát hành
    // ---------------------------------------------------------------

    @Transactional
    public InvoiceResponse cancel(
            User user,
            Long invoiceId,
            String reason
    ) {
        if (user == null || user.getRole() != User.Role.LANDLORD) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà được hủy hóa đơn"
            );
        }

        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Phải nhập lý do hủy hóa đơn"
            );
        }

        String cancellationReason = reason.trim();

        if (cancellationReason.length() > 500) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Lý do hủy không được vượt quá 500 ký tự"
            );
        }

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hóa đơn"
                ));

        requireBuilding(
                user,
                invoice.getRoom().getBuilding().getId()
        );

        if (invoice.getStatus() != Invoice.Status.ISSUED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ được hủy hóa đơn đã phát hành"
            );
        }

        List<InvoiceItem> items =
                itemRepository.findByInvoiceOrderByIdAsc(invoice);

        InvoiceResponse before = toResponse(invoice, items);

        invoice.setStatus(Invoice.Status.CANCELLED);
        invoice.setCancellationReason(cancellationReason);
        invoiceRepository.save(invoice);

        InvoiceResponse after = toResponse(invoice, items);

        auditLogService.log(
                user,
                "CANCEL",
                "Invoice",
                invoice.getId(),
                before,
                Map.of(
                        "reason", cancellationReason,
                        "invoice", after
                )
        );

        return after;
    }

    // ---------------------------------------------------------------
    // Chuyển hóa đơn sang DTO trả về
    // ---------------------------------------------------------------

    private InvoiceResponse toResponse(
            Invoice invoice,
            List<InvoiceItem> items
    ) {
        RentalContract contract = invoice.getContract();
        Room room = invoice.getRoom();

        List<ItemResponse> itemResponses = items.stream()
                .map(i -> new ItemResponse(
                        i.getId(),
                        i.getLabel(),
                        i.getType().name(),
                        i.getQuantity(),
                        i.getUnit(),
                        i.getUnitPrice(),
                        i.getAmount(),
                        i.getPreviousReading(),
                        i.getCurrentReading(),
                        i.getNote()
                ))
                .toList();

        return new InvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceCode(),
                contract != null ? contract.getId() : null,
                contract != null ? contract.getContractCode() : null,
                room != null ? room.getId() : null,
                room != null ? room.getCode() : null,
                contract != null && contract.getTenant() != null
                        ? contract.getTenant().getName()
                        : null,
                invoice.getPeriod(),
                invoice.getRentAmount(),
                invoice.getTotalAmount(),
                invoice.getStatus().name(),
                invoice.getCancellationReason(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                itemResponses
        );
    }

    // ---------------------------------------------------------------
    // Tra cứu đơn giá dịch vụ
    // ---------------------------------------------------------------

    private record ServiceCfg(
            com.troroom.backend.entity.Service.CalculationMethod method,
            long price
    ) {
    }

    private ServiceCfg resolveCfg(
            Room room,
            Building building,
            com.troroom.backend.entity.Service service,
            LocalDate date
    ) {
        Optional<BuildingService> buildingCfg =
                buildingServiceRepository
                        .findByBuildingAndServiceOrderByEffectiveFromDesc(
                                building,
                                service
                        )
                        .stream()
                        .filter(b -> b.getEffectiveFrom() != null
                                && !b.getEffectiveFrom().isAfter(date))
                        .findFirst();

        if (buildingCfg.isPresent()) {
            return new ServiceCfg(
                    buildingCfg.get().getCalculationMethod(),
                    buildingCfg.get().getPrice()
            );
        }

        Optional<RoomService> roomCfg =
                roomServiceRepository.findByRoomAndService(room, service);

        if (roomCfg.isPresent()) {
            return new ServiceCfg(
                    service.getCalculationMethod(),
                    roomCfg.get().getPrice()
            );
        }

        return new ServiceCfg(
                service.getCalculationMethod(),
                service.getPrice()
        );
    }

    private com.troroom.backend.entity.Service findUtility(
            List<com.troroom.backend.entity.Service> services,
            String name
    ) {
        return services.stream()
                .filter(s -> s.getName() != null
                        && s.getName().trim().equalsIgnoreCase(name))
                .findFirst()
                .orElse(null);
    }

    // ---------------------------------------------------------------
    // Sinh mã hóa đơn
    // ---------------------------------------------------------------

    private String generateInvoiceCode() {
        int year = Year.now().getValue();

        for (int i = 0; i < 100; i++) {
            int number = ThreadLocalRandom.current()
                    .nextInt(1, 100000);

            String code = String.format(
                    "INV-%d-%05d",
                    year,
                    number
            );

            if (!invoiceRepository.existsByInvoiceCode(code)) {
                return code;
            }
        }

        throw new IllegalStateException(
                "Không thể tạo mã hóa đơn"
        );
    }
}