package com.troroom.backend.demo;

import com.troroom.backend.entity.*;
import com.troroom.backend.repository.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

/**
 * Bổ sung dữ liệu mẫu cho các chức năng chưa được seed bởi {@link DemoSeedService}
 * và {@link DemoInvoiceSeedService}: dịch vụ, giá dịch vụ, chỉ số điện nước,
 * báo hỏng, chứng từ thanh toán, thông báo, người ở ghép, ảnh phòng, gia hạn
 * hợp đồng, tất toán trả phòng, nhật ký hệ thống...
 *
 * Chỉ chạy khi profile "staging" và demo.seed.enabled=true (giống seed cũ).
 * Mọi phần đều idempotent (kiểm tra trước khi tạo) nên chạy lại được nhiều lần.
 */
@org.springframework.stereotype.Service
@Profile("staging")
public class DemoDataSeedService {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private final UserRepository users;
    private final BuildingRepository buildings;
    private final RoomRepository rooms;
    private final ListingRepository listings;
    private final RentalContractRepository contracts;
    private final RentalRequestRepository requests;
    private final RentalRequestHistoryRepository requestHistories;
    private final ServiceRepository services;
    private final BuildingServiceRepository buildingServices;
    private final RoomServiceRepository roomServices;
    private final ServicePriceHistoryRepository priceHistories;
    private final MeterReadingRepository meterReadings;
    private final ContractRenewalRepository renewals;
    private final MaintenanceReportRepository maintenanceReports;
    private final MaintenanceReportPhotoRepository reportPhotos;
    private final MaintenanceReportStatusHistoryRepository reportHistories;
    private final PaymentReportRepository paymentReports;
    private final NotificationRepository notifications;
    private final RoommateRepository roommates;
    private final RoomImageRepository roomImages;
    private final SettlementRepository settlements;
    private final SettlementItemRepository settlementItems;
    private final AuditLogRepository auditLogs;
    private final EmailDeliveryFailureRepository emailFailures;
    private final TenantProfileRepository tenantProfiles;
    private final InvoiceRepository invoices;
    private final InvoiceItemRepository invoiceItems;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public DemoDataSeedService(
            UserRepository users,
            BuildingRepository buildings,
            RoomRepository rooms,
            ListingRepository listings,
            RentalContractRepository contracts,
            RentalRequestRepository requests,
            RentalRequestHistoryRepository requestHistories,
            ServiceRepository services,
            BuildingServiceRepository buildingServices,
            RoomServiceRepository roomServices,
            ServicePriceHistoryRepository priceHistories,
            MeterReadingRepository meterReadings,
            ContractRenewalRepository renewals,
            MaintenanceReportRepository maintenanceReports,
            MaintenanceReportPhotoRepository reportPhotos,
            MaintenanceReportStatusHistoryRepository reportHistories,
            PaymentReportRepository paymentReports,
            NotificationRepository notifications,
            RoommateRepository roommates,
            RoomImageRepository roomImages,
            SettlementRepository settlements,
            SettlementItemRepository settlementItems,
            AuditLogRepository auditLogs,
            EmailDeliveryFailureRepository emailFailures,
            TenantProfileRepository tenantProfiles,
            InvoiceRepository invoices,
            InvoiceItemRepository invoiceItems,
            PasswordEncoder passwordEncoder,
            @Value("${demo.password}") String demoPassword) {

        this.users = users;
        this.buildings = buildings;
        this.rooms = rooms;
        this.listings = listings;
        this.contracts = contracts;
        this.requests = requests;
        this.requestHistories = requestHistories;
        this.services = services;
        this.buildingServices = buildingServices;
        this.roomServices = roomServices;
        this.priceHistories = priceHistories;
        this.meterReadings = meterReadings;
        this.renewals = renewals;
        this.maintenanceReports = maintenanceReports;
        this.reportPhotos = reportPhotos;
        this.reportHistories = reportHistories;
        this.paymentReports = paymentReports;
        this.notifications = notifications;
        this.roommates = roommates;
        this.roomImages = roomImages;
        this.settlements = settlements;
        this.settlementItems = settlementItems;
        this.auditLogs = auditLogs;
        this.emailFailures = emailFailures;
        this.tenantProfiles = tenantProfiles;
        this.invoices = invoices;
        this.invoiceItems = invoiceItems;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    @Transactional
    public void seed() {
        seedServices();
        seedServicePricing();
        seedMeterReadings();
        seedContractRenewals();
        seedMaintenanceReports();
        seedPaymentReports();
        seedNotifications();
        seedRoommates();
        seedRoomImages();
        seedExtraRentalRequests();
        seedTenantProfiles();
        seedSettlementDemo();
        seedAuditLogs();
        seedEmailFailures();
    }

    // ---------------------------------------------------------------
    // 1. Dịch vụ (điện, nước, internet, vệ sinh, gửi xe)
    // ---------------------------------------------------------------

    private void seedServices() {
        createServiceIfMissing("Điện", com.troroom.backend.entity.Service.CalculationMethod.BY_METER,
                "kWh", 3500, "Tiền điện tính theo đồng hồ");
        createServiceIfMissing("Nước", com.troroom.backend.entity.Service.CalculationMethod.BY_METER,
                "m³", 15000, "Tiền nước tính theo đồng hồ");
        createServiceIfMissing("Internet", com.troroom.backend.entity.Service.CalculationMethod.FIXED_ROOM,
                "phòng", 100000, "Cước internet cố định theo phòng");
        createServiceIfMissing("Vệ sinh", com.troroom.backend.entity.Service.CalculationMethod.BY_PERSON,
                "người", 20000, "Phí vệ sinh tính theo đầu người");
        createServiceIfMissing("Gửi xe", com.troroom.backend.entity.Service.CalculationMethod.FIXED_ROOM,
                "xe", 80000, "Phí gửi xe theo phòng");
    }

    private void createServiceIfMissing(String name,
            com.troroom.backend.entity.Service.CalculationMethod method,
            String unit, long price, String description) {

        if (services.existsByNameIgnoreCase(name)) {
            return;
        }
        com.troroom.backend.entity.Service s = new com.troroom.backend.entity.Service();
        s.setName(name);
        s.setCalculationMethod(method);
        s.setUnit(unit);
        s.setPrice(price);
        s.setDescription(description);
        s.setActive(true);
        services.save(s);
    }

    // ---------------------------------------------------------------
    // 2. Giá dịch vụ theo toà + theo phòng + lịch sử giá
    // ---------------------------------------------------------------

    private void seedServicePricing() {
        com.troroom.backend.entity.Service dien = findService("Điện");
        com.troroom.backend.entity.Service nuoc = findService("Nước");
        com.troroom.backend.entity.Service internet = findService("Internet");
        com.troroom.backend.entity.Service vesinh = findService("Vệ sinh");
        com.troroom.backend.entity.Service guixe = findService("Gửi xe");

        if (dien == null || nuoc == null) {
            return;
        }

        LocalDate sixMonthsAgo = LocalDate.now(VN).minusMonths(6).withDayOfMonth(1);
        LocalDate oneYearAgo = LocalDate.now(VN).minusMonths(12).withDayOfMonth(1);

        // Giá điện/nước áp dụng theo từng toà nhà.
        int idx = 0;
        for (Building building : demoBuildings()) {
            addBuildingServiceIfMissing(building, dien, 3500L + idx * 100, sixMonthsAgo);
            addBuildingServiceIfMissing(building, nuoc, 15000L + idx * 500, sixMonthsAgo);
            idx++;
        }

        // Lịch sử giá điện/nước (giá cũ -> giá mới).
        if (priceHistories.findByServiceOrderByEffectiveFromDesc(dien).isEmpty()) {
            savePriceHistory(dien, 3200, oneYearAgo);
        }
        if (priceHistories.findByServiceOrderByEffectiveFromDesc(nuoc).isEmpty()) {
            savePriceHistory(nuoc, 14000, oneYearAgo);
        }

        // Dịch vụ cố định gắn theo phòng đang thuê.
        for (RentalContract contract : demoContracts()) {
            Room room = contract.getRoom();
            if (room == null) {
                continue;
            }
            if (internet != null) {
                addRoomServiceIfMissing(room, internet, 100000);
            }
            if (guixe != null) {
                addRoomServiceIfMissing(room, guixe, 80000);
            }
            if (vesinh != null) {
                addRoomServiceIfMissing(room, vesinh, 20000);
            }
        }
    }

    private void addBuildingServiceIfMissing(Building building,
            com.troroom.backend.entity.Service service, long price, LocalDate effectiveFrom) {

        if (!buildingServices.findByBuildingAndServiceOrderByEffectiveFromDesc(building, service).isEmpty()) {
            return;
        }
        BuildingService bs = new BuildingService();
        bs.setBuilding(building);
        bs.setService(service);
        bs.setCalculationMethod(com.troroom.backend.entity.Service.CalculationMethod.BY_METER);
        bs.setPrice(price);
        bs.setEffectiveFrom(effectiveFrom);
        buildingServices.save(bs);
    }

    private void addRoomServiceIfMissing(Room room,
            com.troroom.backend.entity.Service service, long price) {

        if (roomServices.findByRoomAndService(room, service).isPresent()) {
            return;
        }
        RoomService rs = new RoomService();
        rs.setRoom(room);
        rs.setService(service);
        rs.setPrice(price);
        roomServices.save(rs);
    }

    private void savePriceHistory(com.troroom.backend.entity.Service service,
            long price, LocalDate effectiveFrom) {

        ServicePriceHistory h = new ServicePriceHistory();
        h.setService(service);
        h.setPrice(price);
        h.setEffectiveFrom(effectiveFrom);
        priceHistories.save(h);
    }

    // ---------------------------------------------------------------
    // 3. Chỉ số điện nước (chuỗi liền mạch 4 kỳ gần nhất)
    // ---------------------------------------------------------------

    private void seedMeterReadings() {
        User manager = user("manager@demo.local");
        YearMonth first = YearMonth.now(VN).minusMonths(3);

        List<RentalContract> contractList = demoContracts();
        for (int i = 0; i < contractList.size(); i++) {
            RentalContract contract = contractList.get(i);
            Room room = contract.getRoom();
            if (room == null) {
                continue;
            }

            int elec = contract.getInitialElectricity() != null ? contract.getInitialElectricity() : 0;
            int water = contract.getInitialWater() != null ? contract.getInitialWater() : 0;

            for (int m = 0; m < 4; m++) {
                YearMonth month = first.plusMonths(m);
                String period = month.toString();
                if (meterReadings.findByContractAndPeriod(contract, period).isPresent()) {
                    continue;
                }

                int elecPrev = elec;
                int waterPrev = water;
                elec += 80 + (i % 7) * 15;
                water += 4 + (i % 4);

                MeterReading reading = new MeterReading();
                reading.setContract(contract);
                reading.setRoom(room);
                reading.setPeriod(period);
                reading.setElectricityPrev(elecPrev);
                reading.setElectricity(elec);
                reading.setWaterPrev(waterPrev);
                reading.setWater(water);
                reading.setRecordedBy(manager);
                reading.setRecordedAt(
                        LocalDateTime.of(month.getYear(), month.getMonthValue(), 5, 9, 0));
                meterReadings.save(reading);
            }
        }
    }

    // ---------------------------------------------------------------
    // 4. Gia hạn hợp đồng (tăng giá thuê)
    // ---------------------------------------------------------------

    private void seedContractRenewals() {
        User landlord = user("landlord@demo.local");
        List<RentalContract> contractList = demoContracts();

        for (int i = 0; i < Math.min(4, contractList.size()); i++) {
            RentalContract contract = contractList.get(i);
            if (!renewals.findByContractOrderByCreatedAtDesc(contract).isEmpty()) {
                continue;
            }
            LocalDate start = LocalDate.now(VN).minusMonths(2).withDayOfMonth(1);

            ContractRenewal renewal = new ContractRenewal();
            renewal.setContract(contract);
            renewal.setStartDate(start);
            renewal.setEndDate(start.plusMonths(12).minusDays(1));
            renewal.setTermMonths(12);
            renewal.setRent(contract.getRent() + 200000);
            renewal.setRenewedBy(landlord);
            renewal.setCreatedAt(LocalDateTime.now(VN).minusMonths(2));
            renewals.save(renewal);
        }
    }

    // ---------------------------------------------------------------
    // 5. Báo hỏng sửa chữa (nhiều trạng thái)
    // ---------------------------------------------------------------

    private void seedMaintenanceReports() {
        User manager = user("manager@demo.local");
        List<RentalContract> contractList = demoContracts();

        createReportIfMissing("SC-0001", contractAt(contractList, 0),
                "Máy lạnh", "Máy lạnh không lạnh, cần kiểm tra gas.",
                MaintenanceReport.Urgency.NORMAL, MaintenanceReport.Status.NEW,
                null, null, null, false, manager);

        createReportIfMissing("SC-0002", contractAt(contractList, 1),
                "Vòi nước", "Vòi nước nhà tắm bị rò rỉ.",
                MaintenanceReport.Urgency.URGENT, MaintenanceReport.Status.IN_PROGRESS,
                "Đã cử thợ đến kiểm tra.", null, null, false, manager);

        createReportIfMissing("SC-0003", contractAt(contractList, 2),
                "Bóng đèn", "Đèn phòng khách bị cháy.",
                MaintenanceReport.Urgency.NORMAL, MaintenanceReport.Status.COMPLETED,
                "Đã thay bóng đèn mới.", 50000L, MaintenanceReport.CostPayer.LANDLORD, false, manager);

        createReportIfMissing("SC-0004", contractAt(contractList, 3),
                "Cửa phòng", "Khoá cửa bị kẹt, khách tự làm hỏng.",
                MaintenanceReport.Urgency.NORMAL, MaintenanceReport.Status.COMPLETED,
                "Đã thay khoá mới.", 300000L, MaintenanceReport.CostPayer.TENANT, true, manager);

        createReportIfMissing("SC-0005", contractAt(contractList, 4),
                "Điều hoà", "Điều hoà kêu to.",
                MaintenanceReport.Urgency.NORMAL, MaintenanceReport.Status.REJECTED,
                "Yêu cầu không hợp lệ, thiết bị vẫn hoạt động bình thường.", null, null, false, manager);

        createReportIfMissing("SC-0006", contractAt(contractList, 5),
                "Bồn cầu", "Bồn cầu bị tắc nghẽn.",
                MaintenanceReport.Urgency.URGENT, MaintenanceReport.Status.NEW,
                null, null, null, false, manager);

        createReportIfMissing("SC-0007", contractAt(contractList, 6),
                "Quạt trần", "Quạt trần quay chậm.",
                MaintenanceReport.Urgency.NORMAL, MaintenanceReport.Status.IN_PROGRESS,
                "Đã đặt linh kiện thay thế.", null, null, false, manager);

        createReportIfMissing("SC-0008", contractAt(contractList, 7),
                "Ổ điện", "Ổ điện bếp bị lỏng, nguy hiểm.",
                MaintenanceReport.Urgency.URGENT, MaintenanceReport.Status.COMPLETED,
                "Đã siết lại và thay ổ cắm.", 120000L, MaintenanceReport.CostPayer.LANDLORD, false, manager);
    }

    private void createReportIfMissing(String code, RentalContract contract,
            String deviceType, String description, MaintenanceReport.Urgency urgency,
            MaintenanceReport.Status status, String managerResponse, Long repairCost,
            MaintenanceReport.CostPayer costPayer, boolean tenantInvoicePending, User manager) {

        if (contract == null || maintenanceReports.existsByReportCode(code)) {
            return;
        }

        MaintenanceReport report = new MaintenanceReport();
        report.setReportCode(code);
        report.setTenant(contract.getTenant());
        report.setContract(contract);
        report.setRoom(contract.getRoom());
        report.setDeviceType(deviceType);
        report.setDescription(description);
        report.setUrgency(urgency);
        report.setStatus(status);
        report.setManagerResponse(managerResponse);
        report.setRepairCost(repairCost);
        report.setCostPayer(costPayer);
        report.setTenantInvoicePending(tenantInvoicePending);
        report.setCreatedAt(LocalDateTime.now(VN).minusDays(3));
        report.setUpdatedAt(LocalDateTime.now(VN).minusDays(1));
        report = maintenanceReports.save(report);

        MaintenanceReportPhoto photo = new MaintenanceReportPhoto();
        photo.setReport(report);
        photo.setStoredFilename("demo-" + code + ".jpg");
        photo.setOriginalFilename(code + "-hinh-anh.jpg");
        photo.setContentType("image/jpeg");
        reportPhotos.save(photo);

        addReportHistory(report, null, status.name(), "Tạo yêu cầu báo hỏng", report.getTenant());
        if (status != MaintenanceReport.Status.NEW) {
            addReportHistory(report, "NEW", status.name(),
                    "Cập nhật trạng thái xử lý", manager);
        }
    }

    private void addReportHistory(MaintenanceReport report, String oldStatus,
            String newStatus, String note, User actor) {

        MaintenanceReportStatusHistory h = new MaintenanceReportStatusHistory();
        h.setReport(report);
        h.setOldStatus(oldStatus);
        h.setNewStatus(newStatus);
        h.setNote(note);
        h.setChangedBy(actor);
        h.setChangedAt(LocalDateTime.now(VN).minusDays(1));
        reportHistories.save(h);
    }

    // ---------------------------------------------------------------
    // 6. Chứng từ thanh toán của khách (chờ duyệt / đã duyệt / bị từ chối)
    // ---------------------------------------------------------------

    private void seedPaymentReports() {
        List<RentalContract> contractList = demoContracts();
        createPaymentReportIfMissing(contractAt(contractList, 8), PaymentReport.Status.PENDING);
        createPaymentReportIfMissing(contractAt(contractList, 9), PaymentReport.Status.CONFIRMED);
        createPaymentReportIfMissing(contractAt(contractList, 12), PaymentReport.Status.PENDING);
        createPaymentReportIfMissing(contractAt(contractList, 13), PaymentReport.Status.REJECTED);
        createPaymentReportIfMissing(contractAt(contractList, 14), PaymentReport.Status.CONFIRMED);
    }

    private void createPaymentReportIfMissing(RentalContract contract, PaymentReport.Status status) {
        if (contract == null) {
            return;
        }

        Invoice invoice = latestInvoice(contract);
        if (invoice == null || invoice.getStatus() == Invoice.Status.CANCELLED) {
            return;
        }
        if (!paymentReports.findByInvoiceOrderByCreatedAtDesc(invoice).isEmpty()) {
            return;
        }

        PaymentReport report = new PaymentReport();
        report.setInvoice(invoice);
        report.setTenant(contract.getTenant());
        report.setAmount(Math.max(1L, invoice.getTotalAmount() - invoice.getPaidAmount()));
        report.setPaymentDate(LocalDate.now(VN).minusDays(1));
        report.setPaymentMethod(PaymentReport.PaymentMethod.TRANSFER);
        report.setProofImagePath("demo-payment-proof-" + invoice.getInvoiceCode() + ".jpg");
        report.setStatus(status);
        paymentReports.save(report);
    }

    // ---------------------------------------------------------------
    // 7. Thông báo
    // ---------------------------------------------------------------

    private void seedNotifications() {
        if (notifications.count() > 0) {
            return;
        }
        User landlord = user("landlord@demo.local");
        User t1 = user("tenant01@demo.local");
        User t2 = user("tenant02@demo.local");

        addNotification(t1, Notification.Type.INVOICE_ISSUED,
                "Hoá đơn mới", "Bạn có hoá đơn kỳ này cần thanh toán.", landlord);
        addNotification(t1, Notification.Type.INVOICE_DUE_REMINDER,
                "Nhắc hạn thanh toán", "Hoá đơn của bạn sắp đến hạn thanh toán.", landlord);
        addNotification(t2, Notification.Type.REQUEST_ACCEPTED,
                "Yêu cầu được duyệt", "Yêu cầu thuê phòng của bạn đã được duyệt.", landlord);
        addNotification(t2, Notification.Type.INVOICE_ISSUED,
                "Hoá đơn mới", "Bạn có hoá đơn mới cần thanh toán.", landlord);
        addNotification(landlord, Notification.Type.REQUEST_ACCEPTED,
                "Yêu cầu thuê phòng mới", "Có yêu cầu thuê phòng mới cần xử lý.", null);
    }

    private void addNotification(User user, Notification.Type type,
            String title, String message, User landlord) {

        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        if (landlord != null) {
            n.setLandlordName(landlord.getName());
            n.setLandlordPhone(landlord.getPhone());
            n.setLandlordEmail(landlord.getEmail());
        }
        n.setCreatedAt(LocalDateTime.now(VN).minusDays(1));
        n.setRead(false);
        notifications.save(n);
    }

    // ---------------------------------------------------------------
    // 8. Người ở ghép
    // ---------------------------------------------------------------

    private void seedRoommates() {
        List<RentalContract> contractList = demoContracts();
        for (int i = 0; i < Math.min(6, contractList.size()); i++) {
            Room room = contractList.get(i).getRoom();
            if (room == null) {
                continue;
            }
            addRoommateIfMissing(room, "Nguyễn Ở Ghép " + (i + 1),
                    "093200000" + i, "01234567890" + i, Roommate.Status.ACTIVE);
        }

        // Một người đã chuyển đi (để test trạng thái MOVED_OUT).
        if (contractList.size() > 2 && contractList.get(2).getRoom() != null) {
            Room room = contractList.get(2).getRoom();
            addRoommateIfMissing(room, "Trần Đã Rời",
                    "0932999999", "0999888777", Roommate.Status.MOVED_OUT);
        }
    }

    private void addRoommateIfMissing(Room room, String fullName, String phone,
            String citizenId, Roommate.Status status) {

        if (roommates.existsByRoomIdAndPhoneAndStatus(room.getId(), phone, status)) {
            return;
        }
        Roommate roommate = new Roommate();
        roommate.setRoom(room);
        roommate.setFullName(fullName);
        roommate.setPhone(phone);
        roommate.setCitizenId(citizenId);
        roommate.setStartDate(LocalDate.now(VN).minusMonths(3));
        if (status == Roommate.Status.MOVED_OUT) {
            roommate.setEndDate(LocalDate.now(VN).minusMonths(1));
        }
        roommate.setStatus(status);
        roommate.setCreatedAt(LocalDateTime.now(VN).minusMonths(3));
        roommates.save(roommate);
    }

    // ---------------------------------------------------------------
    // 9. Ảnh phòng
    // ---------------------------------------------------------------

    private void seedRoomImages() {
        for (Building building : demoBuildings()) {
            List<Room> roomList = rooms.findByBuilding(building).stream()
                    .sorted(Comparator.comparing(Room::getCode))
                    .toList();

            for (int i = 0; i < Math.min(6, roomList.size()); i++) {
                Room room = roomList.get(i);
                if (roomImages.countByRoom(room) > 0) {
                    continue;
                }
                for (int k = 0; k < 2; k++) {
                    RoomImage img = new RoomImage();
                    img.setRoom(room);
                    img.setImageUrl("https://placehold.co/600x400?text=" + room.getCode() + "-" + (k + 1));
                    img.setSortOrder(k);
                    roomImages.save(img);
                }
            }
        }
    }

    // ---------------------------------------------------------------
    // 10. Yêu cầu thuê phòng ở nhiều trạng thái khác nhau
    // ---------------------------------------------------------------

    private void seedExtraRentalRequests() {
        User landlord = user("landlord@demo.local");
        List<Building> buildingList = demoBuildings();
        if (buildingList.isEmpty()) {
            return;
        }

        // Lấy các phòng trống (có tin đăng PUBLISHED) để tạo yêu cầu thuê.
        List<Room> emptyRooms = rooms.findAll().stream()
                .filter(r -> r.getStatus() == Room.Status.EMPTY)
                .sorted(Comparator.comparing(Room::getCode))
                .toList();

        int seq = 0;
        for (Room room : emptyRooms) {
            if (seq >= 5) {
                break;
            }
            Listing listing = listings.findAllByRoom(room).stream().findFirst().orElse(null);
            if (listing == null) {
                continue;
            }
            User tenant = user(String.format("tenant%02d@demo.local", 5 + seq));

            createRequestIfMissing("REQ-DEMO-" + (seq + 1), listing, tenant,
                    seq % 2 == 0 ? RentalRequest.Type.RENT_NOW : RentalRequest.Type.VIEWING,
                    LocalDate.now(VN).plusDays(seq + 2), 1 + seq % 2,
                    requestStatusFor(seq), landlord, seq);
            seq++;
        }
    }

    private void createRequestIfMissing(String code, Listing listing, User tenant,
            RentalRequest.Type type, LocalDate desiredDate, int expectedPeople,
            RentalRequest.Status status, User landlord, int seq) {

        if (requests.existsByRequestCode(code)) {
            return;
        }

        RentalRequest request = new RentalRequest();
        request.setRequestCode(code);
        request.setListing(listing);
        request.setTenant(tenant);
        request.setType(type);
        request.setDesiredDate(desiredDate);
        request.setExpectedPeople(expectedPeople);
        request.setMessage("Tôi muốn xem phòng và thuê ngay nếu phù hợp.");
        request.setStatus(status);
        request.setCreatedAt(LocalDateTime.now(VN).minusDays(seq + 1));
        if (status == RentalRequest.Status.SCHEDULED) {
            request.setScheduledAt(LocalDateTime.now(VN).plusDays(1).withHour(9).withMinute(0));
        }
        if (status == RentalRequest.Status.REJECTED) {
            request.setRejectReason(RentalRequest.RejectReason.OTHER);
            request.setRejectNote("Phòng đã có người đặt cọc trước.");
        }
        request = requests.save(request);

        // Lịch sử yêu cầu (createdAt tự set bằng now()).
        RentalRequestHistory history = new RentalRequestHistory(
                request, null, status.name(), tenant, "Tạo yêu cầu thuê phòng");
        requestHistories.save(history);
    }

    private RentalRequest.Status requestStatusFor(int seq) {
        return switch (seq % 4) {
            case 0 -> RentalRequest.Status.OPEN;
            case 1 -> RentalRequest.Status.SCHEDULED;
            case 2 -> RentalRequest.Status.REJECTED;
            default -> RentalRequest.Status.CANCELLED;
        };
    }

    // ---------------------------------------------------------------
    // 11. Hồ sơ khách thuê
    // ---------------------------------------------------------------

    private void seedTenantProfiles() {
        for (int i = 1; i <= 5; i++) {
            User tenant = user(String.format("tenant%02d@demo.local", i));
            if (tenantProfiles.findByUser(tenant).isPresent()) {
                continue;
            }
            TenantProfile profile = new TenantProfile();
            profile.setUser(tenant);
            profile.setDateOfBirth("199" + (i % 10) + "-0" + (i % 9 + 1) + "-10");
            profile.setCitizenId("01234567890" + i);
            profile.setHometown("TP. Hồ Chí Minh");
            profile.setJob(i % 2 == 0 ? "Nhân viên văn phòng" : "Kỹ sư phần mềm");
            tenantProfiles.save(profile);
        }
    }

    // ---------------------------------------------------------------
    // 12. Trả phòng và tất toán tiền cọc (hợp đồng đã kết thúc)
    // ---------------------------------------------------------------

    private void seedSettlementDemo() {
        // Đã seed rồi thì bỏ qua.
        if (contracts.findAll().stream().anyMatch(c -> "HD-CHK-01".equals(c.getContractCode()))) {
            return;
        }

        User landlord = user("landlord@demo.local");
        Building building = demoBuildings().stream().findFirst().orElse(null);
        if (building == null) {
            return;
        }
        Room room = rooms.findByBuildingAndCode(building, "P111").orElse(null);
        if (room == null) {
            return;
        }

        User tenant = users.findByEmail("tenant21@demo.local").orElseGet(() -> {
            User u = new User();
            u.setEmail("tenant21@demo.local");
            u.setPhone("0910000021");
            u.setName("Khách thuê Đã trả 21");
            u.setRole(User.Role.TENANT);
            u.setActive(true);
            u.setPassword(passwordEncoder.encode(demoPassword));
            u.setFailedLoginAttempts(0);
            u.setMustChangePassword(false);
            return users.save(u);
        });

        Listing listing = listings.findAllByRoom(room).stream().findFirst().orElse(null);

        LocalDate start = LocalDate.now(VN).minusMonths(13).withDayOfMonth(1);
        LocalDate checkoutDate = LocalDate.now(VN).minusMonths(1).minusDays(1);

        RentalRequest request = new RentalRequest();
        request.setRequestCode("REQ-CHK-01");
        request.setListing(listing);
        request.setTenant(tenant);
        request.setType(RentalRequest.Type.RENT_NOW);
        request.setDesiredDate(start);
        request.setExpectedPeople(2);
        request.setStatus(RentalRequest.Status.ACCEPTED);
        request.setCreatedAt(start.atStartOfDay());
        request = requests.save(request);

        RentalContract contract = new RentalContract();
        contract.setContractCode("HD-CHK-01");
        contract.setRequest(request);
        contract.setTenant(tenant);
        contract.setRoom(room);
        contract.setRent(4000000L);
        contract.setDeposit(4000000L);
        contract.setStartDate(start);
        contract.setTermMonths(12);
        contract.setEndDate(start.plusMonths(12).minusDays(1));
        contract.setBillingCutoffDay(5);
        contract.setInitialElectricity(0);
        contract.setInitialWater(0);
        contract.setCreatedAt(start.atStartOfDay());
        contract.setStatus(RentalContract.Status.ENDED);
        contract.setTerminated(true);
        contract.setTerminatedAt(checkoutDate);
        contract.setTerminationReason("Khách chuyển nơi ở mới");
        contract = contracts.save(contract);

        YearMonth lastMonth = YearMonth.from(checkoutDate);
        Invoice invoice = new Invoice();
        invoice.setInvoiceCode("INV-CHK-01");
        invoice.setContract(contract);
        invoice.setRoom(room);
        invoice.setPeriod(lastMonth.toString());
        invoice.setRentAmount(4000000L);
        invoice.setTotalAmount(4200000L);
        invoice.setStatus(Invoice.Status.ISSUED);
        invoice.setIssueDate(checkoutDate);
        invoice.setDueDate(checkoutDate);
        invoice.setCreatedAt(checkoutDate.atStartOfDay());
        invoice = invoices.save(invoice);

        InvoiceItem item = new InvoiceItem();
        item.setInvoice(invoice);
        item.setLabel("Tiền phòng kỳ cuối");
        item.setType(InvoiceItem.Type.RENT);
        item.setQuantity(1);
        item.setUnit("tháng");
        item.setUnitPrice(4200000L);
        item.setAmount(4200000L);
        invoiceItems.save(item);

        Settlement settlement = new Settlement();
        settlement.setContract(contract);
        settlement.setRoom(room);
        settlement.setCheckoutDate(checkoutDate);
        settlement.setLastElectricity(150);
        settlement.setLastWater(20);
        settlement.setFinalElectricity(180);
        settlement.setFinalWater(25);
        settlement.setFinalInvoice(invoice);
        settlement.setDepositAmount(4000000L);
        settlement.setTotalDeductions(300000L);
        settlement.setPreviousDebt(0L);
        settlement.setFinalInvoiceAmount(4200000L);
        settlement.setRefundAmount(-500000L);
        settlement.setEarlyTerminated(true);
        settlement.setTerminationReason("Khách chuyển nơi ở mới");
        settlement.setCreatedBy(landlord);
        settlement.setCreatedAt(checkoutDate.atStartOfDay());
        settlement = settlements.save(settlement);

        SettlementItem deduction = new SettlementItem();
        deduction.setSettlement(settlement);
        deduction.setLabel("Khấu trừ sửa khoá cửa");
        deduction.setType(SettlementItem.Type.DAMAGE);
        deduction.setAmount(300000L);
        settlementItems.save(deduction);
    }

    // ---------------------------------------------------------------
    // 13. Nhật ký hệ thống
    // ---------------------------------------------------------------

    private void seedAuditLogs() {
        if (auditLogs.count() > 0) {
            return;
        }
        User landlord = user("landlord@demo.local");
        addAuditLog(landlord, "CREATE", "Building", null, "Tạo toà nhà mẫu");
        addAuditLog(landlord, "CREATE", "Room", null, "Tạo phòng mẫu");
        addAuditLog(landlord, "ISSUE", "Invoice", null, "Phát hành hoá đơn mẫu");
    }

    private void addAuditLog(User actor, String action, String objectType, Long objectId, String afterData) {
        AuditLog log = new AuditLog();
        log.setTimestamp(LocalDateTime.now(VN).minusDays(2));
        log.setActor(actor);
        log.setActorRole(actor.getRole().name());
        log.setAction(action);
        log.setObjectType(objectType);
        log.setObjectId(objectId);
        log.setAfterData(afterData);
        auditLogs.save(log);
    }

    // ---------------------------------------------------------------
    // 14. Lỗi gửi email
    // ---------------------------------------------------------------

    private void seedEmailFailures() {
        if (emailFailures.count() > 0) {
            return;
        }

        List<Invoice> invoiceList = invoices.findAll().stream()
                .sorted(Comparator.comparing(Invoice::getId))
                .toList();

        EmailDeliveryFailure failure1 = new EmailDeliveryFailure();
        failure1.setInvoice(invoiceList.isEmpty() ? null : invoiceList.get(0));
        failure1.setRecipientEmail("tenant-khong-email@demo.local");
        failure1.setAttemptCount(3);
        failure1.setErrorMessage("SMTP connection refused");
        failure1.setResolved(false);
        emailFailures.save(failure1);

        EmailDeliveryFailure failure2 = new EmailDeliveryFailure();
        failure2.setInvoice(null);
        failure2.setRecipientEmail("sai-dia-chi@gmail.com");
        failure2.setAttemptCount(3);
        failure2.setErrorMessage("Address not found");
        failure2.setResolved(true);
        emailFailures.save(failure2);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private User user(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Thiếu user demo: " + email));
    }

    private List<Building> demoBuildings() {
        return buildings.findByLandlord(user("landlord@demo.local")).stream()
                .sorted(Comparator.comparing(Building::getName))
                .toList();
    }

    private List<RentalContract> demoContracts() {
        return contracts.findAll().stream()
                .filter(c -> c.getContractCode() != null && c.getContractCode().startsWith("HD-S410-"))
                .sorted(Comparator.comparing(RentalContract::getContractCode))
                .toList();
    }

    private RentalContract contractAt(List<RentalContract> list, int index) {
        return index < list.size() ? list.get(index) : null;
    }

    private com.troroom.backend.entity.Service findService(String name) {
        return services.findByActive(true).stream()
                .filter(s -> name.equals(s.getName()))
                .findFirst()
                .orElse(null);
    }

    private Invoice latestInvoice(RentalContract contract) {
        return invoices.findAll().stream()
                .filter(inv -> inv.getContract() != null
                        && inv.getContract().getId().equals(contract.getId()))
                .max(Comparator.comparing(Invoice::getPeriod))
                .orElse(null);
    }
}
