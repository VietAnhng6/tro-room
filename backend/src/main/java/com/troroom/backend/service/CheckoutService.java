package com.troroom.backend.service;

import com.troroom.backend.dto.CheckoutDtos.*;
import com.troroom.backend.entity.*;
import com.troroom.backend.repository.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/**
 * S4-04: Xử lý trả phòng và tất toán tiền cọc có trừ hư hỏng.
 *
 * Trả phòng tạo hoá đơn kỳ cuối (tiền phòng theo tỉ lệ ngày ở thực tế cộng
 * điện nước phát sinh), lập bảng tất toán gồm tiền cọc, khấu trừ hư hỏng và
 * phạt cọc, công nợ cũ, rồi kết thúc hợp đồng trong cùng một giao dịch.
 */
@Service
public class CheckoutService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final RentalContractRepository contractRepository;
    private final RoomRepository roomRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final MeterReadingRepository meterReadingRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementItemRepository settlementItemRepository;
    private final ServiceRepository serviceRepository;
    private final BuildingServiceRepository buildingServiceRepository;
    private final RoomServiceRepository roomServiceRepository;
    private final ContractRenewalRepository renewalRepository;
    private final AuditLogService auditLogService;
    private final SettlementPdfService settlementPdfService;
    private final ListingService listingService;

    public CheckoutService(
            RentalContractRepository contractRepository,
            RoomRepository roomRepository,
            InvoiceRepository invoiceRepository,
            InvoiceItemRepository invoiceItemRepository,
            MeterReadingRepository meterReadingRepository,
            SettlementRepository settlementRepository,
            SettlementItemRepository settlementItemRepository,
            ServiceRepository serviceRepository,
            BuildingServiceRepository buildingServiceRepository,
            RoomServiceRepository roomServiceRepository,
            ContractRenewalRepository renewalRepository,
            AuditLogService auditLogService,
            SettlementPdfService settlementPdfService,
            ListingService listingService
    ) {
        this.contractRepository = contractRepository;
        this.roomRepository = roomRepository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.meterReadingRepository = meterReadingRepository;
        this.settlementRepository = settlementRepository;
        this.settlementItemRepository = settlementItemRepository;
        this.serviceRepository = serviceRepository;
        this.buildingServiceRepository = buildingServiceRepository;
        this.roomServiceRepository = roomServiceRepository;
        this.renewalRepository = renewalRepository;
        this.auditLogService = auditLogService;
        this.settlementPdfService = settlementPdfService;
        this.listingService = listingService;
    }

    // ------------------------------------------------------------------
    // Xem trước bảng tất toán (chưa lưu gì xuống cơ sở dữ liệu)
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public SettlementResponse preview(User user, Long contractId, CheckoutRequest req) {
        RentalContract contract = requireContract(contractId);
        requireManagerAccess(user, contract);
        Computed computed = compute(contract, req);
        return toResponse(computed);
    }

    // ------------------------------------------------------------------
    // Thực hiện tất toán
    // ------------------------------------------------------------------

    @Transactional
    public SettlementResponse settle(User user, Long contractId, CheckoutRequest req) {
        RentalContract contract = requireContract(contractId);
        requireManagerAccess(user, contract);

        if (contract.getStatus() != RentalContract.Status.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Hợp đồng đã kết thúc, không thể tất toán lại"
            );
        }

        if (settlementRepository.existsByContractId(contractId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Hợp đồng đã có bảng tất toán"
            );
        }

        String originalEndDate = contract.getEndDate() != null
                ? contract.getEndDate().toString()
                : "";

        Computed computed = compute(contract, req);

        // 1. Tạo hoá đơn kỳ cuối (nếu kỳ chưa có hoá đơn).
        Invoice finalInvoice = null;
        if (computed.createFinalInvoice()) {
            finalInvoice = persistFinalInvoice(user, contract, computed);
        } else {
            finalInvoice = invoiceRepository
                    .findByContractAndPeriodAndStatusNot(
                            contract,
                            computed.finalPeriod(),
                            Invoice.Status.CANCELLED
                    )
                    .orElse(null);
        }

        // 2. Ghi chỉ số cuối vào bảng meter_readings để chuỗi chỉ số liền mạch.
        if (computed.createFinalInvoice()
                && meterReadingRepository
                        .findByContractAndPeriod(contract, computed.finalPeriod())
                        .isEmpty()) {
            MeterReading reading = new MeterReading();
            reading.setContract(contract);
            reading.setRoom(contract.getRoom());
            reading.setPeriod(computed.finalPeriod());
            reading.setElectricityPrev(computed.lastElectricity());
            reading.setElectricity(computed.finalElectricity());
            reading.setWaterPrev(computed.lastWater());
            reading.setWater(computed.finalWater());
            reading.setRecordedBy(user);
            reading.setRecordedAt(LocalDateTime.now(ZONE));
            meterReadingRepository.save(reading);
        }

        // 3. Lưu bảng tất toán và các dòng khấu trừ.
        Settlement settlement = new Settlement();
        settlement.setContract(contract);
        settlement.setRoom(contract.getRoom());
        settlement.setCheckoutDate(computed.checkoutDate());
        settlement.setLastElectricity(computed.lastElectricity());
        settlement.setLastWater(computed.lastWater());
        settlement.setFinalElectricity(computed.finalElectricity());
        settlement.setFinalWater(computed.finalWater());
        settlement.setFinalInvoice(finalInvoice);
        settlement.setDepositAmount(computed.deposit());
        settlement.setTotalDeductions(computed.totalDeductions());
        settlement.setPreviousDebt(computed.previousDebt());
        settlement.setFinalInvoiceAmount(computed.finalInvoiceAmount());
        settlement.setRefundAmount(computed.net());
        settlement.setEarlyTerminated(computed.early());
        settlement.setTerminationReason(computed.reason());
        settlement.setCreatedBy(user);
        settlement.setCreatedAt(LocalDateTime.now(ZONE));

        Settlement savedSettlement = settlementRepository.save(settlement);

        for (Deduction d : computed.deductions()) {
            SettlementItem item = new SettlementItem();
            item.setSettlement(savedSettlement);
            item.setLabel(d.label());
            item.setType(d.type());
            item.setAmount(d.amount());
            settlementItemRepository.save(item);
        }

        // 4. Kết thúc hợp đồng và chuyển phòng về Trống trong cùng giao dịch.
        contract.setStatus(RentalContract.Status.ENDED);
        contract.setEndDate(computed.checkoutDate());
        if (computed.early()) {
            contract.setTerminated(true);
            contract.setTerminatedAt(computed.checkoutDate());
            contract.setTerminationReason(computed.reason());
        }
        contractRepository.saveAndFlush(contract);

        Room room = contract.getRoom();
        if (room != null) {
            room.setStatus(Room.Status.EMPTY);
            roomRepository.saveAndFlush(room);

            // S4-05: trong cùng transaction tất toán, nhân bản tin cũ thành
            // tin nháp. Ảnh gắn với room_id nên được giữ nguyên; giá đăng lại
            // lấy từ room.rent hiện tại, không dùng giá cũ của hợp đồng.
            listingService.createRepublishDraftFromEndedContract(contract);
        }

        auditLogService.log(
                user,
                "CHECKOUT",
                "RENTAL_CONTRACT",
                contract.getId(),
                Map.of(
                        "contractCode", contract.getContractCode(),
                        "endDate", originalEndDate,
                        "status", "ACTIVE"
                ),
                Map.of(
                        "contractCode", contract.getContractCode(),
                        "status", contract.getStatus().name(),
                        "checkoutDate", computed.checkoutDate().toString(),
                        "finalElectricity", computed.finalElectricity(),
                        "finalWater", computed.finalWater(),
                        "deposit", computed.deposit(),
                        "totalDeductions", computed.totalDeductions(),
                        "previousDebt", computed.previousDebt(),
                        "finalInvoiceAmount", computed.finalInvoiceAmount(),
                        "refundAmount", computed.net()
                )
        );

        return toResponse(computed);
    }

    // ------------------------------------------------------------------
    // Xem bảng tất toán đã lưu (chủ nhà, quản lý và khách thuê của hợp đồng)
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public SettlementResponse getSettlementResponse(User user, Long contractId) {
        return toResponse(requireSettlementForUser(user, contractId));
    }

    @Transactional(readOnly = true)
    public byte[] getPdf(User user, Long contractId) {
        Settlement settlement = requireSettlementForUser(user, contractId);
        return settlementPdfService.generatePdf(settlement);
    }

    public Settlement requireSettlementForUser(User user, Long contractId) {
        RentalContract contract = requireContract(contractId);
        requireViewAccess(user, contract);

        return settlementRepository.findByContractId(contractId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Hợp đồng chưa có bảng tất toán"
                ));
    }

    // ------------------------------------------------------------------
    // Tính toán chung (không có tác dụng phụ)
    // ------------------------------------------------------------------

    private Computed compute(RentalContract contract, CheckoutRequest req) {
        if (req == null || req.actualCheckoutDate() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Phải nhập ngày trả thực tế"
            );
        }

        LocalDate checkoutDate = req.actualCheckoutDate();

        if (contract.getStartDate() != null
                && checkoutDate.isBefore(contract.getStartDate())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày trả phòng không được trước ngày bắt đầu hợp đồng"
            );
        }

        if (req.finalElectricity() == null || req.finalWater() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Phải nhập chỉ số điện và nước cuối cùng"
            );
        }

        int lastElectricity = lastElectricity(contract);
        int lastWater = lastWater(contract);

        if (!CheckoutCalculator.isReadingValid(
                req.finalElectricity(), lastElectricity)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ số điện cuối ("
                            + req.finalElectricity()
                            + ") không được nhỏ hơn lần chốt gần nhất ("
                            + lastElectricity + ")"
            );
        }

        if (!CheckoutCalculator.isReadingValid(
                req.finalWater(), lastWater)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ số nước cuối ("
                            + req.finalWater()
                            + ") không được nhỏ hơn lần chốt gần nhất ("
                            + lastWater + ")"
            );
        }

        boolean early = checkoutDate.isBefore(contract.getEndDate())
                || Boolean.TRUE.equals(req.earlyTermination());

        String reason = null;
        long depositPenalty = 0;

        if (early) {
            if (req.terminationReason() == null
                    || req.terminationReason().isBlank()
                    || req.terminationReason().trim().length() < 5) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Chấm dứt trước hạn phải nhập lý do ít nhất 5 ký tự"
                );
            }
            if (req.depositPenaltyAmount() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Vui lòng chỉ rõ có áp dụng phạt cọc hay không"
                );
            }
            if (req.depositPenaltyAmount() < 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Mức phạt cọc không được âm"
                );
            }
            reason = req.terminationReason().trim();
            depositPenalty = req.depositPenaltyAmount();
        }

        List<Deduction> deductions = new ArrayList<>();
        long totalDeductions = 0;

        if (req.deductions() != null) {
            for (DeductionRequest input : req.deductions()) {
                if (input == null
                        || input.name() == null
                        || input.name().isBlank()) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Khoản khấu trừ hư hỏng phải có tên khoản"
                    );
                }
                if (input.amount() <= 0) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Số tiền khấu trừ phải lớn hơn 0"
                    );
                }
                deductions.add(new Deduction(
                        input.name().trim(),
                        SettlementItem.Type.DAMAGE,
                        input.amount()
                ));
            }
        }

        if (depositPenalty > 0) {
            deductions.add(new Deduction(
                    "Phạt cọc do chấm dứt trước hạn",
                    SettlementItem.Type.DEPOSIT_PENALTY,
                    depositPenalty
            ));
        }

        totalDeductions = deductions.stream()
                .mapToLong(Deduction::amount)
                .sum();

        long previousDebt = invoiceRepository
                .findUnpaidByContractId(contract.getId())
                .stream()
                .mapToLong(Invoice::getRemainingAmount)
                .sum();

        // Hoá đơn kỳ cuối.
        String finalPeriod = YearMonth.from(checkoutDate).toString();
        boolean createFinalInvoice = !invoiceRepository
                .existsByContractAndPeriodAndStatusNot(
                        contract,
                        finalPeriod,
                        Invoice.Status.CANCELLED
                );

        long finalInvoiceAmount = 0;
        List<FinalLine> finalLines = new ArrayList<>();

        if (createFinalInvoice) {
            long monthlyRent = resolveRentForPeriod(contract, YearMonth.from(checkoutDate));
            int days = CheckoutCalculator.finalPeriodDays(
                    checkoutDate,
                    contract.getStartDate()
            );
            int daysInMonth = YearMonth.from(checkoutDate).lengthOfMonth();
            long rentAmount = CheckoutCalculator.proRateRent(
                    monthlyRent,
                    days,
                    daysInMonth
            );

            finalLines.add(new FinalLine(
                    "Tiền phòng ("
                            + days + " ngày ở thực tế)",
                    InvoiceItem.Type.RENT,
                    1,
                    "tháng",
                    rentAmount,
                    rentAmount,
                    null,
                    null
            ));

            Room room = contract.getRoom();
            Building building = room != null ? room.getBuilding() : null;

            List<com.troroom.backend.entity.Service> activeServices =
                    serviceRepository.findByActive(true);

            com.troroom.backend.entity.Service electricityService =
                    findUtility(activeServices, "Điện");
            com.troroom.backend.entity.Service waterService =
                    findUtility(activeServices, "Nước");

            if (electricityService != null && building != null && room != null) {
                ServiceCfg cfg = resolveCfg(room, building, electricityService, checkoutDate);
                if (cfg.method()
                        == com.troroom.backend.entity.Service.CalculationMethod.BY_METER) {
                    int usage = req.finalElectricity() - lastElectricity;
                    long amount = (long) usage * cfg.price();
                    finalLines.add(new FinalLine(
                            "Tiền điện",
                            InvoiceItem.Type.ELECTRICITY,
                            usage,
                            electricityService.getUnit(),
                            cfg.price(),
                            amount,
                            lastElectricity,
                            req.finalElectricity()
                    ));
                }
            }

            if (waterService != null && building != null && room != null) {
                ServiceCfg cfg = resolveCfg(room, building, waterService, checkoutDate);
                if (cfg.method()
                        == com.troroom.backend.entity.Service.CalculationMethod.BY_METER) {
                    int usage = req.finalWater() - lastWater;
                    long amount = (long) usage * cfg.price();
                    finalLines.add(new FinalLine(
                            "Tiền nước",
                            InvoiceItem.Type.WATER,
                            usage,
                            waterService.getUnit(),
                            cfg.price(),
                            amount,
                            lastWater,
                            req.finalWater()
                    ));
                }
            }

            for (FinalLine line : finalLines) {
                finalInvoiceAmount = Math.addExact(finalInvoiceAmount, line.amount());
            }
        }

        long net = CheckoutCalculator.netRefund(
                contract.getDeposit(),
                totalDeductions,
                previousDebt,
                finalInvoiceAmount
        );

        return new Computed(
                contract,
                checkoutDate,
                lastElectricity,
                lastWater,
                req.finalElectricity(),
                req.finalWater(),
                contract.getDeposit(),
                List.copyOf(deductions),
                totalDeductions,
                previousDebt,
                finalPeriod,
                createFinalInvoice,
                finalLines,
                finalInvoiceAmount,
                net,
                early,
                reason
        );
    }

    // ------------------------------------------------------------------
    // Lưu hoá đơn kỳ cuối
    // ------------------------------------------------------------------

    private Invoice persistFinalInvoice(
            User user,
            RentalContract contract,
            Computed computed
    ) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(generateInvoiceCode());
        invoice.setContract(contract);
        invoice.setRoom(contract.getRoom());
        invoice.setPeriod(computed.finalPeriod());
        invoice.setRentAmount(rentLineAmount(computed));
        invoice.setTotalAmount(computed.finalInvoiceAmount());
        invoice.setStatus(Invoice.Status.ISSUED);
        invoice.setIssueDate(computed.checkoutDate());
        invoice.setDueDate(computed.checkoutDate());
        invoice.setCreatedAt(LocalDateTime.now(ZONE));

        Invoice saved = invoiceRepository.save(invoice);

        for (FinalLine line : computed.finalLines()) {
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
            invoiceItemRepository.save(item);
        }

        auditLogService.log(
                user,
                "CREATE",
                "Invoice",
                saved.getId(),
                null,
                Map.of(
                        "invoiceCode", saved.getInvoiceCode(),
                        "roomCode", contract.getRoom() != null
                                ? contract.getRoom().getCode() : "",
                        "period", computed.finalPeriod(),
                        "totalAmount", saved.getTotalAmount(),
                        "note", "Hoá đơn kỳ cuối khi trả phòng"
                )
        );

        return saved;
    }

    private long rentLineAmount(Computed computed) {
        return computed.finalLines().stream()
                .filter(l -> l.type() == InvoiceItem.Type.RENT)
                .mapToLong(FinalLine::amount)
                .findFirst()
                .orElse(0L);
    }

    // ------------------------------------------------------------------
    // Trả về DTO
    // ------------------------------------------------------------------

    private SettlementResponse toResponse(Computed c) {
        RentalContract contract = c.contract();
        Room room = contract.getRoom();
        Building building = room != null ? room.getBuilding() : null;
        User tenant = contract.getTenant();

        List<DeductionResponse> deductions = c.deductions().stream()
                .map(d -> new DeductionResponse(
                        d.label(),
                        d.type().name(),
                        d.amount()
                ))
                .toList();

        List<FinalInvoiceLineResponse> lines = c.finalLines().stream()
                .map(l -> new FinalInvoiceLineResponse(
                        l.label(),
                        l.type().name(),
                        l.quantity(),
                        l.unit(),
                        l.unitPrice(),
                        l.amount(),
                        l.previousReading(),
                        l.currentReading()
                ))
                .toList();

        long refund = Math.max(0L, c.net());
        long payable = c.net() < 0 ? -c.net() : 0L;

        return new SettlementResponse(
                contract.getId(),
                contract.getContractCode(),
                room != null ? room.getId() : null,
                room != null ? room.getCode() : "",
                building != null ? building.getName() : "",
                tenant != null ? tenant.getName() : "",
                tenant != null ? tenant.getPhone() : "",
                c.checkoutDate(),
                c.lastElectricity(),
                c.lastWater(),
                c.finalElectricity(),
                c.finalWater(),
                c.deposit(),
                deductions,
                c.totalDeductions(),
                c.previousDebt(),
                null,
                lines,
                c.finalInvoiceAmount(),
                refund,
                payable,
                c.early(),
                c.reason(),
                null
        );
    }

    /**
     * Chuyển bảng tất toán đã lưu sang DTO dùng các số liệu đông cứng đã ghi.
     */
    private SettlementResponse toResponse(Settlement s) {
        RentalContract contract = s.getContract();
        Room room = s.getRoom();
        Building building = room != null ? room.getBuilding() : null;
        User tenant = contract != null ? contract.getTenant() : null;

        List<DeductionResponse> deductions =
                settlementItemRepository.findBySettlementOrderByIdAsc(s)
                        .stream()
                        .map(i -> new DeductionResponse(
                                i.getLabel(),
                                i.getType().name(),
                                i.getAmount()
                        ))
                        .toList();

        List<FinalInvoiceLineResponse> lines = new ArrayList<>();
        if (s.getFinalInvoice() != null) {
            invoiceItemRepository.findByInvoiceOrderByIdAsc(s.getFinalInvoice())
                    .forEach(i -> lines.add(new FinalInvoiceLineResponse(
                            i.getLabel(),
                            i.getType().name(),
                            i.getQuantity(),
                            i.getUnit(),
                            i.getUnitPrice(),
                            i.getAmount(),
                            i.getPreviousReading(),
                            i.getCurrentReading()
                    )));
        }

        long refund = Math.max(0L, s.getRefundAmount());
        long payable = s.getRefundAmount() < 0 ? -s.getRefundAmount() : 0L;

        return new SettlementResponse(
                contract != null ? contract.getId() : null,
                contract != null ? contract.getContractCode() : "",
                room != null ? room.getId() : null,
                room != null ? room.getCode() : "",
                building != null ? building.getName() : "",
                tenant != null ? tenant.getName() : "",
                tenant != null ? tenant.getPhone() : "",
                s.getCheckoutDate(),
                s.getLastElectricity(),
                s.getLastWater(),
                s.getFinalElectricity(),
                s.getFinalWater(),
                s.getDepositAmount(),
                deductions,
                s.getTotalDeductions(),
                s.getPreviousDebt(),
                s.getFinalInvoice() != null
                        ? s.getFinalInvoice().getInvoiceCode()
                        : null,
                lines,
                s.getFinalInvoiceAmount(),
                refund,
                payable,
                s.isEarlyTerminated(),
                s.getTerminationReason(),
                s.getCreatedAt()
        );
    }

    // ------------------------------------------------------------------
    // Quyền truy cập
    // ------------------------------------------------------------------

    private RentalContract requireContract(Long contractId) {
        if (contractId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID hợp đồng không hợp lệ"
            );
        }
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hợp đồng"
                ));
    }

    private void requireManagerAccess(User user, RentalContract contract) {
        if (user == null || user.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập"
            );
        }

        Room room = contract.getRoom();
        Building building = room != null ? room.getBuilding() : null;

        boolean landlord = user.getRole() == User.Role.LANDLORD
                && building != null
                && building.getLandlord() != null
                && building.getLandlord().getId().equals(user.getId());

        boolean manager = user.getRole() == User.Role.MANAGER
                && building != null
                && building.getManager() != null
                && building.getManager().getId().equals(user.getId());

        if (!landlord && !manager) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền trả phòng cho hợp đồng này"
            );
        }
    }

    private void requireViewAccess(User user, RentalContract contract) {
        if (user == null || user.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập"
            );
        }

        // Khách thuê đứng tên được xem bảng tất toán của hợp đồng của mình.
        if (contract.getTenant() != null
                && contract.getTenant().getId().equals(user.getId())) {
            return;
        }

        requireManagerAccess(user, contract);
    }

    // ------------------------------------------------------------------
    // Chỉ số lần chốt gần nhất
    // ------------------------------------------------------------------

    private int lastElectricity(RentalContract contract) {
        MeterReading latest = meterReadingRepository
                .findFirstByContractOrderByPeriodDesc(contract)
                .orElse(null);
        if (latest != null) {
            return latest.getElectricity();
        }
        return contract.getInitialElectricity() != null
                ? contract.getInitialElectricity()
                : 0;
    }

    private int lastWater(RentalContract contract) {
        MeterReading latest = meterReadingRepository
                .findFirstByContractOrderByPeriodDesc(contract)
                .orElse(null);
        if (latest != null) {
            return latest.getWater();
        }
        return contract.getInitialWater() != null
                ? contract.getInitialWater()
                : 0;
    }

    // ------------------------------------------------------------------
    // Giá thuê theo kỳ (có xét gia hạn) và đơn giá điện nước
    // ------------------------------------------------------------------

    private long resolveRentForPeriod(RentalContract contract, YearMonth period) {
        if (contract == null || contract.getRent() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giá thuê hợp đồng không hợp lệ"
            );
        }

        LocalDate periodStart = period.atDay(1);
        LocalDate periodEnd = period.atEndOfMonth();

        List<ContractRenewal> renewals =
                renewalRepository.findByContract_IdOrderByStartDateAsc(contract.getId());

        ContractRenewal applicable = null;

        for (ContractRenewal renewal : renewals) {
            if (renewal.getStartDate() == null || renewal.getEndDate() == null) {
                continue;
            }
            boolean overlaps = !renewal.getStartDate().isAfter(periodEnd)
                    && !renewal.getEndDate().isBefore(periodStart);
            if (overlaps
                    && (applicable == null
                    || renewal.getStartDate().isAfter(applicable.getStartDate()))) {
                applicable = renewal;
            }
        }

        return applicable == null || applicable.getRent() <= 0
                ? contract.getRent()
                : applicable.getRent();
    }

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
                        .findByBuildingAndServiceOrderByEffectiveFromDesc(building, service)
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

    private String generateInvoiceCode() {
        int year = Year.now().getValue();
        for (int i = 0; i < 100; i++) {
            int number = ThreadLocalRandom.current().nextInt(1, 100000);
            String code = String.format("INV-%d-%05d", year, number);
            if (!invoiceRepository.existsByInvoiceCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Không thể tạo mã hóa đơn");
    }

    // ------------------------------------------------------------------
    // Các kiểu dữ liệu nội bộ
    // ------------------------------------------------------------------

    private record Deduction(
            String label,
            SettlementItem.Type type,
            long amount
    ) {
    }

    private record FinalLine(
            String label,
            InvoiceItem.Type type,
            int quantity,
            String unit,
            long unitPrice,
            long amount,
            Integer previousReading,
            Integer currentReading
    ) {
    }

    private record Computed(
            RentalContract contract,
            LocalDate checkoutDate,
            int lastElectricity,
            int lastWater,
            int finalElectricity,
            int finalWater,
            long deposit,
            List<Deduction> deductions,
            long totalDeductions,
            long previousDebt,
            String finalPeriod,
            boolean createFinalInvoice,
            List<FinalLine> finalLines,
            long finalInvoiceAmount,
            long net,
            boolean early,
            String reason
    ) {
    }
}
