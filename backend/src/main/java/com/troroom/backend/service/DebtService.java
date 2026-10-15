package com.troroom.backend.service;

import com.troroom.backend.dto.DebtDtos.*;
import com.troroom.backend.entity.*;
import com.troroom.backend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * S4-03: Xem công nợ theo phòng và theo toà.
 */
@Service
public class DebtService {

    private final BuildingRepository buildingRepository;
    private final InvoiceRepository invoiceRepository;
    private final RoomRepository roomRepository;
    private final RentalContractRepository contractRepository;
    private final RentalRequestRepository requestRepository;
    private final ListingRepository listingRepository;
    private final UserRepository userRepository;

    public DebtService(
            BuildingRepository buildingRepository,
            InvoiceRepository invoiceRepository,
            RoomRepository roomRepository,
            RentalContractRepository contractRepository,
            RentalRequestRepository requestRepository,
            ListingRepository listingRepository,
            UserRepository userRepository
    ) {
        this.buildingRepository = buildingRepository;
        this.invoiceRepository = invoiceRepository;
        this.roomRepository = roomRepository;
        this.contractRepository = contractRepository;
        this.requestRepository = requestRepository;
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
    }

    /**
     * Lấy danh sách công nợ theo phòng và theo toà cho Chủ nhà / Quản lý.
     */
    @Transactional(readOnly = true)
    public DebtSummaryResponse getDebts(
            User currentUser,
            DebtFilterRequest filter,
            LocalDate referenceDate
    ) {
        validateAccessRole(currentUser);

        LocalDate today = referenceDate != null ? referenceDate : LocalDate.now();

        List<Building> accessibleBuildings = getAccessibleBuildings(currentUser);
        if (accessibleBuildings.isEmpty()) {
            return new DebtSummaryResponse(List.of(), 0, 0L, 0);
        }

        // Lọc theo toà nhà nếu có truyền buildingId
        if (filter != null && filter.buildingId() != null && filter.buildingId() > 0) {
            Long targetBuildingId = filter.buildingId();
            boolean hasAccess = accessibleBuildings.stream()
                    .anyMatch(b -> b.getId().equals(targetBuildingId));
            if (!hasAccess) {
                return new DebtSummaryResponse(List.of(), 0, 0L, 0);
            }
            accessibleBuildings = accessibleBuildings.stream()
                    .filter(b -> b.getId().equals(targetBuildingId))
                    .toList();
        }

        List<Long> buildingIds = accessibleBuildings.stream()
                .map(Building::getId)
                .toList();

        // Lấy tất cả hoá đơn đã phát hành (ISSUED) mà chưa trả hết (totalAmount > paidAmount)
        List<Invoice> unpaidInvoices = invoiceRepository
                .findUnpaidInvoicesByBuildingIds(buildingIds, Invoice.Status.ISSUED);

        // Gom nhóm theo Phòng
        Map<Long, List<Invoice>> invoicesByRoom = new LinkedHashMap<>();
        for (Invoice invoice : unpaidInvoices) {
            if (invoice.getRoom() == null) continue;
            invoicesByRoom
                    .computeIfAbsent(invoice.getRoom().getId(), k -> new ArrayList<>())
                    .add(invoice);
        }

        List<RoomDebtItem> roomDebtItems = new ArrayList<>();

        for (Map.Entry<Long, List<Invoice>> entry : invoicesByRoom.entrySet()) {
            List<Invoice> roomInvoices = entry.getValue();
            if (roomInvoices.isEmpty()) continue;

            // Sắp xếp theo hạn thanh toán tăng dần để hoá đơn cũ nhất nằm ở vị trí đầu
            roomInvoices.sort(Comparator
                    .comparing(Invoice::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(Invoice::getId));

            Invoice oldestInvoice = roomInvoices.get(0);
            Room room = oldestInvoice.getRoom();
            Building building = room != null ? room.getBuilding() : null;
            RentalContract contract = oldestInvoice.getContract();
            User tenant = contract != null ? contract.getTenant() : null;

            int unpaidCount = roomInvoices.size();
            long totalRemainingDebt = roomInvoices.stream()
                    .mapToLong(Invoice::getRemainingAmount)
                    .sum();

            LocalDate oldestDueDate = oldestInvoice.getDueDate();
            // Logic số ngày quá hạn: Lấy ngày hôm nay trừ đi hạn thanh toán của hóa đơn cũ nhất chưa trả hết
            long maxDaysOverdue = oldestDueDate != null
                    ? ChronoUnit.DAYS.between(oldestDueDate, today)
                    : 0;

            // Áp dụng bộ lọc
            if (filter != null) {
                if (filter.buildingId() != null && (building == null || !filter.buildingId().equals(building.getId()))) {
                    continue;
                }
                if (filter.minOverdueDays() != null && maxDaysOverdue < filter.minOverdueDays()) {
                    continue;
                }
                if (filter.maxOverdueDays() != null && maxDaysOverdue > filter.maxOverdueDays()) {
                    continue;
                }
                // Áp dụng bộ lọc ngưỡng số tiền còn thiếu
                if (filter.minDebtAmount() != null && totalRemainingDebt < filter.minDebtAmount()) {
                    continue;
                }
                if (filter.maxDebtAmount() != null && totalRemainingDebt > filter.maxDebtAmount()) {
                    continue;
                }
            }

            List<DebtInvoiceItem> invoiceItems = roomInvoices.stream()
                    .map(inv -> {
                        long days = inv.getDueDate() != null
                                ? ChronoUnit.DAYS.between(inv.getDueDate(), today)
                                : 0;
                        return new DebtInvoiceItem(
                                inv.getId(),
                                inv.getInvoiceCode(),
                                inv.getPeriod(),
                                inv.getIssueDate(),
                                inv.getDueDate(),
                                inv.getTotalAmount(),
                                inv.getPaidAmount(),
                                inv.getRemainingAmount(),
                                days,
                                inv.getStatus().name()
                        );
                    })
                    .toList();

            String tenantName = tenant != null && tenant.getName() != null && !tenant.getName().isBlank()
                    ? tenant.getName()
                    : "—";

            roomDebtItems.add(new RoomDebtItem(
                    building != null ? building.getId() : null,
                    building != null ? building.getName() : "—",
                    room != null ? room.getId() : null,
                    room != null ? room.getCode() : "—",
                    contract != null ? contract.getId() : null,
                    contract != null ? contract.getContractCode() : "—",
                    tenantName,
                    tenant != null && tenant.getPhone() != null ? tenant.getPhone() : "—",
                    unpaidCount,
                    totalRemainingDebt,
                    oldestDueDate,
                    maxDaysOverdue,
                    invoiceItems
            ));
        }

        // Sắp xếp kết quả: số ngày quá hạn dài nhất giảm dần, sau đó đến tổng nợ giảm dần
        roomDebtItems.sort(Comparator
                .comparingLong(RoomDebtItem::maxDaysOverdue).reversed()
                .thenComparing(Comparator.comparingLong(RoomDebtItem::totalRemainingDebt).reversed())
                .thenComparing(RoomDebtItem::roomCode));

        // 3. Có dòng tổng cộng số tiền còn thiếu của tập kết quả đang lọc
        long totalRemainingDebtFiltered = roomDebtItems.stream()
                .mapToLong(RoomDebtItem::totalRemainingDebt)
                .sum();

        int totalUnpaidInvoicesFiltered = roomDebtItems.stream()
                .mapToInt(RoomDebtItem::unpaidInvoiceCount)
                .sum();

        return new DebtSummaryResponse(
                roomDebtItems,
                roomDebtItems.size(),
                totalRemainingDebtFiltered,
                totalUnpaidInvoicesFiltered
        );
    }

    /**
     * Xuất danh sách đang lọc ra tệp CSV mã hoá UTF-8 có BOM '\ufeff' để Excel không bị lỗi font tiếng Việt.
     */
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            User currentUser,
            DebtFilterRequest filter,
            LocalDate referenceDate
    ) {
        DebtSummaryResponse summary = getDebts(currentUser, filter, referenceDate);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Chèn BOM UTF-8 (\ufeff = 0xEF, 0xBB, 0xBF)
            baos.write(0xEF);
            baos.write(0xBB);
            baos.write(0xBF);

            try (OutputStreamWriter writer = new OutputStreamWriter(baos, StandardCharsets.UTF_8)) {
                // Header
                writer.write("STT,Tòa nhà,Phòng,Người đứng tên,Số điện thoại,Số HĐ chưa trả hết,Tổng còn thiếu (VNĐ),Hạn thanh toán cũ nhất,Số ngày quá hạn dài nhất\r\n");

                int index = 1;
                for (RoomDebtItem item : summary.items()) {
                    String overdueText = item.maxDaysOverdue() > 0
                            ? item.maxDaysOverdue() + " ngày"
                            : (item.maxDaysOverdue() == 0 ? "Đến hạn hôm nay" : "Chưa đến hạn");

                    writer.write(String.format(
                            "%d,%s,%s,%s,%s,%d,%d,%s,%s\r\n",
                            index++,
                            escapeCsv(item.buildingName()),
                            escapeCsv(item.roomCode()),
                            escapeCsv(item.tenantName()),
                            escapeCsv(item.tenantPhone()),
                            item.unpaidInvoiceCount(),
                            item.totalRemainingDebt(),
                            escapeCsv(item.oldestDueDate() != null ? item.oldestDueDate().toString() : "—"),
                            escapeCsv(overdueText)
                    ));
                }

                // Dòng tổng cộng số tiền còn thiếu của tập kết quả đang lọc
                writer.write(String.format(
                        ",\"TỔNG CỘNG\",,,,\"%d\",\"%d\",,\r\n",
                        summary.totalUnpaidInvoices(),
                        summary.totalRemainingDebt()
                ));

                writer.flush();
            }

            return baos.toByteArray();
        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không thể xuất file CSV công nợ: " + e.getMessage()
            );
        }
    }

    /**
     * Ghi nhận thanh toán cho một hoá đơn (hỗ trợ trả một phần hoặc trả hết).
     */
    @Transactional
    public Invoice recordPayment(User currentUser, Long invoiceId, long amount) {
        validateAccessRole(currentUser);

        if (amount <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Số tiền thanh toán phải lớn hơn 0"
            );
        }

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hoá đơn #" + invoiceId
                ));

        // Kiểm tra quyền đối với toà nhà của hoá đơn
        Room room = invoice.getRoom();
        if (room == null || room.getBuilding() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hoá đơn không gắn với phòng/toà nhà hợp lệ"
            );
        }

        Building building = room.getBuilding();
        boolean hasAccess = currentUser.getRole() == User.Role.ADMIN
                || (currentUser.getRole() == User.Role.LANDLORD && building.getLandlord() != null && building.getLandlord().getId().equals(currentUser.getId()))
                || (currentUser.getRole() == User.Role.MANAGER && building.getManager() != null && building.getManager().getId().equals(currentUser.getId()));

        if (!hasAccess) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền cập nhật thanh toán cho hoá đơn này"
            );
        }

        long newPaidAmount = invoice.getPaidAmount() + amount;
        invoice.setPaidAmount(newPaidAmount);
        return invoiceRepository.save(invoice);
    }

    /**
     * Nạp dữ liệu kiểm thử đạt tiêu chí 4:
     * - Ít nhất 5 trường hợp trả thiếu
     * - 2 trường hợp quá hạn nhiều kỳ
     * - 1 trường hợp thanh toán đủ (để kiểm tra loại trừ)
     */
    @Transactional
    public SeedTestDataResponse seedTestData(User currentUser) {
        validateAccessRole(currentUser);

        User landlord = currentUser.getRole() == User.Role.LANDLORD
                ? currentUser
                : (currentUser.getRole() == User.Role.ADMIN
                ? currentUser
                : null);

        if (landlord == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chức năng nạp dữ liệu mẫu chỉ dành cho Chủ nhà (LANDLORD) hoặc Admin"
            );
        }

        // Tạo hoặc lấy toà nhà kiểm thử
        String buildingName = "Tòa Nhà Demo Công Nợ (S4-03)";
        Building building = buildingRepository.findByLandlord(landlord).stream()
                .filter(b -> buildingName.equalsIgnoreCase(b.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Building b = new Building();
                    b.setName(buildingName);
                    b.setAddress("123 Đường Công Nợ, Quận Cầu Giấy, Hà Nội");
                    b.setDistrict("Cầu Giấy");
                    b.setFloors(5);
                    b.setLandlord(landlord);
                    b.setActive(true);
                    return buildingRepository.save(b);
                });

        // Tạo hoặc lấy người thuê mẫu
        List<User> sampleTenants = new ArrayList<>();
        String[] tenantNames = {
                "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường",
                "Phạm Minh Đức", "Hoàng Thuỳ Dung", "Vũ Tuấn Em",
                "Đặng Hải Nam", "Bùi Thanh Trúc"
        };
        for (int i = 0; i < tenantNames.length; i++) {
            String email = "tenant_test_s403_" + (i + 1) + "@gmail.com";
            final int index = i;
            User tenant = userRepository.findByEmail(email).orElseGet(() -> {
                User u = new User();
                u.setEmail(email);
                u.setPassword("$2a$10$xyzFakePasswordHashForTestingOnly");
                u.setName(tenantNames[index]);
                u.setPhone("098765432" + index);
                u.setRole(User.Role.TENANT);
                u.setActive(true);
                return userRepository.save(u);
            });
            sampleTenants.add(tenant);
        }

        // Tạo phòng mẫu nếu chưa có
        String[] roomCodes = {"P101", "P102", "P201", "P202", "P301", "P302", "P401", "P402"};
        Map<String, Room> roomMap = new HashMap<>();
        for (int i = 0; i < roomCodes.length; i++) {
            String code = roomCodes[i];
            int floor = (i / 2) + 1;
            Room room = roomRepository.findByBuildingAndCode(building, code).orElseGet(() -> {
                Room r = new Room();
                r.setBuilding(building);
                r.setCode(code);
                r.setFloor(floor);
                r.setArea(25.0);
                r.setMaxPeople(2);
                r.setRent(3_500_000L);
                r.setStatus(Room.Status.RENTED);
                return roomRepository.save(r);
            });
            roomMap.put(code, room);
        }

        // Tạo hợp đồng mẫu cho từng phòng
        Map<String, RentalContract> contractMap = new HashMap<>();
        for (int i = 0; i < roomCodes.length; i++) {
            String code = roomCodes[i];
            Room room = roomMap.get(code);
            User tenant = sampleTenants.get(i % sampleTenants.size());

            RentalContract contract = contractRepository.findByRoomOrderByStartDateDesc(room).stream()
                    .findFirst()
                    .orElseGet(() -> {
                        Listing listing = listingRepository.findAllByRoom(room).stream().findFirst().orElseGet(() -> {
                            Listing l = new Listing();
                            l.setRoom(room);
                            l.setTitle("Cho thuê " + room.getCode());
                            l.setStatus(Listing.Status.RENTED);
                            l.setCreatedAt(LocalDateTime.now().minusMonths(6));
                            l.setExpiresAt(LocalDateTime.now().plusMonths(6));
                            return listingRepository.save(l);
                        });

                        RentalRequest req = new RentalRequest();
                        req.setRequestCode("REQ-S403-" + code);
                        req.setTenant(tenant);
                        req.setListing(listing);
                        req.setType(RentalRequest.Type.RENT_NOW);
                        req.setStatus(RentalRequest.Status.ACCEPTED);
                        req = requestRepository.save(req);

                        RentalContract c = new RentalContract();
                        c.setContractCode("HD-S403-" + code);
                        c.setRequest(req);
                        c.setTenant(tenant);
                        c.setRoom(room);
                        c.setRent(3_500_000L);
                        c.setDeposit(3_500_000L);
                        c.setStartDate(LocalDate.now().minusMonths(6));
                        c.setEndDate(LocalDate.now().plusMonths(6));
                        c.setTermMonths(12);
                        c.setBillingCutoffDay(5);
                        c.setCreatedAt(LocalDateTime.now().minusMonths(6));
                        return contractRepository.save(c);
                    });
            contractMap.put(code, contract);
        }

        int invoicesCreated = 0;

        // 1. Phòng P101: Trả thiếu 1 (Tổng 3.500.000, Trả 2.000.000, Thiếu 1.500.000, Hạn 10 ngày trước)
        invoicesCreated += upsertInvoice(contractMap.get("P101"), roomMap.get("P101"), "2026-09",
                3_500_000L, 2_000_000L, LocalDate.now().minusDays(10));

        // 2. Phòng P102: Trả thiếu 2 (Tổng 4.200.000, Trả 3.000.000, Thiếu 1.200.000, Hạn 14 ngày trước)
        invoicesCreated += upsertInvoice(contractMap.get("P102"), roomMap.get("P102"), "2026-09",
                4_200_000L, 3_000_000L, LocalDate.now().minusDays(14));

        // 3. Phòng P201: Trả thiếu 3 (Tổng 2.800.000, Trả 1.000.000, Thiếu 1.800.000, Hạn 5 ngày trước)
        invoicesCreated += upsertInvoice(contractMap.get("P201"), roomMap.get("P201"), "2026-09",
                2_800_000L, 1_000_000L, LocalDate.now().minusDays(5));

        // 4. Phòng P202: Trả thiếu 4 (Tổng 5.000.000, Trả 4.500.000, Thiếu 500.000, Hạn 3 ngày trước)
        invoicesCreated += upsertInvoice(contractMap.get("P202"), roomMap.get("P202"), "2026-09",
                5_000_000L, 4_500_000L, LocalDate.now().minusDays(3));

        // 5. Phòng P301: Trả thiếu 5 (Tổng 3.000.000, Trả 1.500.000, Thiếu 1.500.000, Hạn 7 ngày trước)
        invoicesCreated += upsertInvoice(contractMap.get("P301"), roomMap.get("P301"), "2026-09",
                3_000_000L, 1_500_000L, LocalDate.now().minusDays(7));

        // 6. Phòng P302: Quá hạn nhiều kỳ 1 (3 kỳ chưa trả hết: 2026-07 hạn 71 ngày trước, 2026-08 hạn 40 ngày trước, 2026-09 hạn 10 ngày trước)
        invoicesCreated += upsertInvoice(contractMap.get("P302"), roomMap.get("P302"), "2026-07",
                3_000_000L, 1_000_000L, LocalDate.now().minusDays(71));
        invoicesCreated += upsertInvoice(contractMap.get("P302"), roomMap.get("P302"), "2026-08",
                3_200_000L, 0L, LocalDate.now().minusDays(40));
        invoicesCreated += upsertInvoice(contractMap.get("P302"), roomMap.get("P302"), "2026-09",
                3_100_000L, 1_500_000L, LocalDate.now().minusDays(10));

        // 7. Phòng P401: Quá hạn nhiều kỳ 2 (2 kỳ chưa trả hết: 2026-08 hạn 40 ngày trước, 2026-09 hạn 10 ngày trước)
        invoicesCreated += upsertInvoice(contractMap.get("P401"), roomMap.get("P401"), "2026-08",
                4_000_000L, 2_000_000L, LocalDate.now().minusDays(40));
        invoicesCreated += upsertInvoice(contractMap.get("P401"), roomMap.get("P401"), "2026-09",
                4_000_000L, 0L, LocalDate.now().minusDays(10));

        // 8. Phòng P402: Đã thanh toán đầy đủ (Không nằm trong công nợ)
        invoicesCreated += upsertInvoice(contractMap.get("P402"), roomMap.get("P402"), "2026-09",
                3_500_000L, 3_500_000L, LocalDate.now().minusDays(10));

        return new SeedTestDataResponse(
                "Đã khởi tạo thành công bộ dữ liệu mẫu S4-03 với 5 trường hợp trả thiếu và 2 trường hợp quá hạn nhiều kỳ",
                building.getId(),
                building.getName(),
                roomCodes.length,
                invoicesCreated
        );
    }

    private int upsertInvoice(
            RentalContract contract,
            Room room,
            String period,
            long totalAmount,
            long paidAmount,
            LocalDate dueDate
    ) {
        Invoice invoice = invoiceRepository.findByContractAndPeriod(contract, period).orElseGet(() -> {
            Invoice inv = new Invoice();
            inv.setContract(contract);
            inv.setRoom(room);
            inv.setPeriod(period);
            inv.setInvoiceCode("INV-" + room.getCode() + "-" + period.replace("-", ""));
            inv.setRentAmount(contract != null ? contract.getRent() : 3_000_000L);
            inv.setIssueDate(dueDate.minusDays(10));
            inv.setCreatedAt(LocalDateTime.now().minusDays(15));
            return inv;
        });

        invoice.setStatus(Invoice.Status.ISSUED);
        invoice.setTotalAmount(totalAmount);
        invoice.setPaidAmount(paidAmount);
        invoice.setDueDate(dueDate);
        invoiceRepository.save(invoice);
        return 1;
    }

    private List<Building> getAccessibleBuildings(User currentUser) {
        if (currentUser.getRole() == User.Role.ADMIN) {
            return buildingRepository.findAll();
        } else if (currentUser.getRole() == User.Role.LANDLORD) {
            List<Building> list = buildingRepository.findByLandlord(currentUser);
            if (list != null && !list.isEmpty()) {
                return list;
            }
            return buildingRepository.findAll().stream()
                    .filter(b -> b.getLandlord() != null && b.getLandlord().getId() != null && b.getLandlord().getId().equals(currentUser.getId()))
                    .toList();
        } else if (currentUser.getRole() == User.Role.MANAGER) {
            List<Building> list = buildingRepository.findByManager(currentUser);
            if (list != null && !list.isEmpty()) {
                return list;
            }
            return buildingRepository.findAll().stream()
                    .filter(b -> b.getManager() != null && b.getManager().getId() != null && b.getManager().getId().equals(currentUser.getId()))
                    .toList();
        }
        return List.of();
    }

    private void validateAccessRole(User currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
        }
        User.Role role = currentUser.getRole();
        if (role != User.Role.LANDLORD && role != User.Role.MANAGER && role != User.Role.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà hoặc quản lý mới có quyền xem công nợ"
            );
        }
    }

    private String escapeCsv(Object val) {
        if (val == null) return "";
        String s = val.toString().replace("\"", "\"\"");
        return "\"" + s + "\"";
    }
}
