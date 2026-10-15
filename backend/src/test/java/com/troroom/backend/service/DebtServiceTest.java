package com.troroom.backend.service;

import com.troroom.backend.dto.DebtDtos.*;
import com.troroom.backend.entity.*;
import com.troroom.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Kiểm thử S4-03: Xem công nợ theo phòng và theo toà.
 * Tiêu chí:
 * 1. Hiển thị phòng, người đứng tên, số HĐ chưa trả hết, tổng còn thiếu, số ngày quá hạn dài nhất.
 * 2. Bộ lọc: theo toà nhà, theo khoảng ngày quá hạn, theo ngưỡng số tiền còn thiếu.
 * 3. Dòng tổng cộng số tiền còn thiếu của tập kết quả đang lọc.
 * 4. Bộ dữ liệu kiểm thử gồm ít nhất 5 trường hợp trả thiếu và 2 trường hợp quá hạn nhiều kỳ.
 * 5. Xuất file CSV UTF-8 có chèn BOM '\ufeff'.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DebtServiceTest {

    @Mock
    private BuildingRepository buildingRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RentalContractRepository contractRepository;

    @Mock
    private RentalRequestRepository requestRepository;

    @Mock
    private ListingRepository listingRepository;

    @Mock
    private UserRepository userRepository;

    private DebtService debtService;

    private User landlord;
    private Building buildingA;
    private Building buildingB;
    private LocalDate today;

    private List<Invoice> testInvoices;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
        debtService = new DebtService(
                buildingRepository,
                invoiceRepository,
                roomRepository,
                contractRepository,
                requestRepository,
                listingRepository,
                userRepository
        );

        today = LocalDate.of(2026, 10, 15);

        landlord = new User();
        setId(landlord, 1L);
        landlord.setName("Chủ Nhà Nguyễn Văn A");
        landlord.setEmail("landlord@gmail.com");
        landlord.setRole(User.Role.LANDLORD);

        buildingA = new Building();
        setId(buildingA, 10L);
        buildingA.setName("Tòa Nhà A - Cầu Giấy");
        buildingA.setLandlord(landlord);

        buildingB = new Building();
        setId(buildingB, 20L);
        buildingB.setName("Tòa Nhà B - Thanh Xuân");
        buildingB.setLandlord(landlord);

        when(buildingRepository.findByLandlord(landlord))
                .thenReturn(List.of(buildingA, buildingB));

        // Thiết lập bộ dữ liệu kiểm thử chuẩn
        setupStandardTestDataset();
    }

    private void setupStandardTestDataset() {
        testInvoices = new ArrayList<>();

        // Phòng P101 (Tòa A) - Trường hợp trả thiếu 1
        // HĐ kỳ 2026-09: Tổng 3.500.000, Đã trả 2.000.000 -> Thiếu 1.500.000. Hạn 2026-10-05 (Quá hạn 10 ngày)
        testInvoices.add(createInvoice(101L, buildingA, "P101", "Nguyễn Văn An", "0901111111",
                "2026-09", 3_500_000L, 2_000_000L, LocalDate.of(2026, 10, 5)));

        // Phòng P102 (Tòa A) - Trường hợp trả thiếu 2
        // HĐ kỳ 2026-09: Tổng 4.200.000, Đã trả 3.000.000 -> Thiếu 1.200.000. Hạn 2026-10-01 (Quá hạn 14 ngày)
        testInvoices.add(createInvoice(102L, buildingA, "P102", "Trần Thị Bình", "0902222222",
                "2026-09", 4_200_000L, 3_000_000L, LocalDate.of(2026, 10, 1)));

        // Phòng P201 (Tòa A) - Trường hợp trả thiếu 3
        // HĐ kỳ 2026-09: Tổng 2.800.000, Đã trả 1.000.000 -> Thiếu 1.800.000. Hạn 2026-10-10 (Quá hạn 5 ngày)
        testInvoices.add(createInvoice(201L, buildingA, "P201", "Lê Hoàng Cường", "0903333333",
                "2026-09", 2_800_000L, 1_000_000L, LocalDate.of(2026, 10, 10)));

        // Phòng P202 (Tòa A) - Trường hợp trả thiếu 4
        // HĐ kỳ 2026-09: Tổng 5.000.000, Đã trả 4.500.000 -> Thiếu 500.000. Hạn 2026-10-12 (Quá hạn 3 ngày)
        testInvoices.add(createInvoice(202L, buildingA, "P202", "Phạm Minh Đức", "0904444444",
                "2026-09", 5_000_000L, 4_500_000L, LocalDate.of(2026, 10, 12)));

        // Phòng P301 (Tòa B) - Trường hợp trả thiếu 5
        // HĐ kỳ 2026-09: Tổng 3.000.000, Đã trả 1.500.000 -> Thiếu 1.500.000. Hạn 2026-10-08 (Quá hạn 7 ngày)
        testInvoices.add(createInvoice(301L, buildingB, "P301", "Hoàng Thuỳ Dung", "0905555555",
                "2026-09", 3_000_000L, 1_500_000L, LocalDate.of(2026, 10, 8)));

        // Phòng P302 (Tòa B) - Trường hợp quá hạn nhiều kỳ 1 (3 kỳ chưa trả hết)
        // Kỳ 2026-07: Tổng 3.000.000, Đã trả 1.000.000 -> Thiếu 2.000.000. Hạn 2026-08-05 (Quá hạn 71 ngày)
        testInvoices.add(createInvoice(302L, buildingB, "P302", "Vũ Tuấn Em", "0906666666",
                "2026-07", 3_000_000L, 1_000_000L, LocalDate.of(2026, 8, 5)));
        // Kỳ 2026-08: Tổng 3.200.000, Đã trả 0 -> Thiếu 3.200.000. Hạn 2026-09-05 (Quá hạn 40 ngày)
        testInvoices.add(createInvoice(302L, buildingB, "P302", "Vũ Tuấn Em", "0906666666",
                "2026-08", 3_200_000L, 0L, LocalDate.of(2026, 9, 5)));
        // Kỳ 2026-09: Tổng 3.100.000, Đã trả 1.500.000 -> Thiếu 1.600.000. Hạn 2026-10-05 (Quá hạn 10 ngày)
        testInvoices.add(createInvoice(302L, buildingB, "P302", "Vũ Tuấn Em", "0906666666",
                "2026-09", 3_100_000L, 1_500_000L, LocalDate.of(2026, 10, 5)));

        // Phòng P401 (Tòa B) - Trường hợp quá hạn nhiều kỳ 2 (2 kỳ chưa trả hết)
        // Kỳ 2026-08: Tổng 4.000.000, Đã trả 2.000.000 -> Thiếu 2.000.000. Hạn 2026-09-05 (Quá hạn 40 ngày)
        testInvoices.add(createInvoice(401L, buildingB, "P401", "Đặng Hải Nam", "0907777777",
                "2026-08", 4_000_000L, 2_000_000L, LocalDate.of(2026, 9, 5)));
        // Kỳ 2026-09: Tổng 4.000.000, Đã trả 0 -> Thiếu 4.000.000. Hạn 2026-10-05 (Quá hạn 10 ngày)
        testInvoices.add(createInvoice(401L, buildingB, "P401", "Đặng Hải Nam", "0907777777",
                "2026-09", 4_000_000L, 0L, LocalDate.of(2026, 10, 5)));

        // Mock trả về danh sách hoá đơn chưa trả hết
        when(invoiceRepository.findUnpaidInvoicesByBuildingIds(any(), eq(Invoice.Status.ISSUED)))
                .thenReturn(testInvoices);
    }

    private Invoice createInvoice(
            Long roomId,
            Building building,
            String roomCode,
            String tenantName,
            String phone,
            String period,
            long totalAmount,
            long paidAmount,
            LocalDate dueDate
    ) {
        Room room = new Room();
        setId(room, roomId);
        room.setCode(roomCode);
        room.setBuilding(building);

        User tenant = new User();
        tenant.setName(tenantName);
        tenant.setPhone(phone);

        RentalContract contract = new RentalContract();
        setId(contract, roomId + 1000L);
        contract.setContractCode("HD-" + roomCode);
        contract.setTenant(tenant);
        contract.setRoom(room);

        Invoice inv = new Invoice();
        setId(inv, (long) (testInvoices.size() + 1));
        inv.setInvoiceCode("INV-" + roomCode + "-" + period.replace("-", ""));
        inv.setRoom(room);
        inv.setContract(contract);
        inv.setPeriod(period);
        inv.setTotalAmount(totalAmount);
        inv.setPaidAmount(paidAmount);
        inv.setDueDate(dueDate);
        inv.setStatus(Invoice.Status.ISSUED);
        return inv;
    }

    @Test
    @DisplayName("Tiêu chí 1: Danh sách công nợ hiển thị đúng phòng, người đứng tên, số HĐ chưa trả hết, tổng còn thiếu, số ngày quá hạn dài nhất")
    void testDebtListAndOverdueCalculation() {
        DebtSummaryResponse res = debtService.getDebts(landlord, null, today);

        assertNotNull(res);
        assertEquals(7, res.totalRoomsWithDebt(), "Tổng số phòng có công nợ phải là 7");

        // Kiểm tra phòng P302 (quá hạn nhiều kỳ 1)
        RoomDebtItem p302 = res.items().stream()
                .filter(i -> "P302".equals(i.roomCode()))
                .findFirst()
                .orElse(null);

        assertNotNull(p302);
        assertEquals("Vũ Tuấn Em", p302.tenantName());
        assertEquals(3, p302.unpaidInvoiceCount(), "P302 phải có 3 hoá đơn chưa trả hết");
        assertEquals(2_000_000L + 3_200_000L + 1_600_000L, p302.totalRemainingDebt(), "Tổng còn thiếu của P302 phải là 6.800.000");
        assertEquals(LocalDate.of(2026, 8, 5), p302.oldestDueDate(), "Hạn cũ nhất của P302 là 2026-08-05");
        // Logic: 2026-10-15 trừ 2026-08-05 = 71 ngày
        assertEquals(71, p302.maxDaysOverdue(), "Số ngày quá hạn dài nhất của P302 phải là 71 ngày");

        // Kiểm tra phòng P401 (quá hạn nhiều kỳ 2)
        RoomDebtItem p401 = res.items().stream()
                .filter(i -> "P401".equals(i.roomCode()))
                .findFirst()
                .orElse(null);

        assertNotNull(p401);
        assertEquals("Đặng Hải Nam", p401.tenantName());
        assertEquals(2, p401.unpaidInvoiceCount(), "P401 phải có 2 hoá đơn chưa trả hết");
        assertEquals(2_000_000L + 4_000_000L, p401.totalRemainingDebt(), "Tổng còn thiếu của P401 là 6.000.000");
        assertEquals(LocalDate.of(2026, 9, 5), p401.oldestDueDate());
        // Logic: 2026-10-15 trừ 2026-09-05 = 40 ngày
        assertEquals(40, p401.maxDaysOverdue(), "Số ngày quá hạn dài nhất của P401 phải là 40 ngày");

        // Kiểm tra trường hợp trả thiếu đơn lẻ: P101
        RoomDebtItem p101 = res.items().stream()
                .filter(i -> "P101".equals(i.roomCode()))
                .findFirst()
                .orElse(null);

        assertNotNull(p101);
        assertEquals(1, p101.unpaidInvoiceCount());
        assertEquals(1_500_000L, p101.totalRemainingDebt());
        assertEquals(10, p101.maxDaysOverdue()); // 2026-10-15 trừ 2026-10-05 = 10 ngày
    }

    @Test
    @DisplayName("Tiêu chí 2: Bộ lọc theo toà nhà")
    void testFilterByBuilding() {
        // Lọc Tòa A (id = 10L)
        DebtFilterRequest filterA = new DebtFilterRequest(10L, null, null, null, null);
        DebtSummaryResponse resA = debtService.getDebts(landlord, filterA, today);

        assertEquals(4, resA.totalRoomsWithDebt(), "Tòa A có 4 phòng (P101, P102, P201, P202)");
        assertTrue(resA.items().stream().allMatch(i -> "Tòa Nhà A - Cầu Giấy".equals(i.buildingName())));

        // Lọc Tòa B (id = 20L)
        DebtFilterRequest filterB = new DebtFilterRequest(20L, null, null, null, null);
        DebtSummaryResponse resB = debtService.getDebts(landlord, filterB, today);

        assertEquals(3, resB.totalRoomsWithDebt(), "Tòa B có 3 phòng (P301, P302, P401)");
        assertTrue(resB.items().stream().allMatch(i -> "Tòa Nhà B - Thanh Xuân".equals(i.buildingName())));
    }

    @Test
    @DisplayName("Tiêu chí 2: Bộ lọc theo khoảng ngày quá hạn")
    void testFilterByOverdueDaysRange() {
        // Lọc quá hạn từ 10 ngày trở lên (minOverdueDays = 10)
        // P101 (10 ngày), P102 (14 ngày), P302 (71 ngày), P401 (40 ngày) => 4 phòng
        DebtFilterRequest filterMin10 = new DebtFilterRequest(null, 10, null, null, null);
        DebtSummaryResponse res10 = debtService.getDebts(landlord, filterMin10, today);

        assertEquals(4, res10.totalRoomsWithDebt());
        assertTrue(res10.items().stream().allMatch(i -> i.maxDaysOverdue() >= 10));

        // Lọc quá hạn trong khoảng 5 đến 12 ngày (min = 5, max = 12)
        // P201 (5 ngày), P301 (7 ngày), P101 (10 ngày) => 3 phòng
        DebtFilterRequest filter5to12 = new DebtFilterRequest(null, 5, 12, null, null);
        DebtSummaryResponse res5to12 = debtService.getDebts(landlord, filter5to12, today);

        assertEquals(3, res5to12.totalRoomsWithDebt());
        assertTrue(res5to12.items().stream().allMatch(i -> i.maxDaysOverdue() >= 5 && i.maxDaysOverdue() <= 12));
    }

    @Test
    @DisplayName("Tiêu chí 2: Bộ lọc theo ngưỡng số tiền còn thiếu")
    void testFilterByDebtAmount() {
        // Lọc nợ từ 2.000.000 trở lên (minDebtAmount = 2.000.000)
        // P302 (6.800.000), P401 (6.000.000) => 2 phòng
        DebtFilterRequest filterMin2M = new DebtFilterRequest(null, null, null, 2_000_000L, null);
        DebtSummaryResponse res2M = debtService.getDebts(landlord, filterMin2M, today);

        assertEquals(2, res2M.totalRoomsWithDebt());
        assertTrue(res2M.items().stream().allMatch(i -> i.totalRemainingDebt() >= 2_000_000L));

        // Lọc nợ nhỏ hơn hoặc bằng 1.500.000 (maxDebtAmount = 1.500.000)
        // P101 (1.500.000), P102 (1.200.000), P202 (500.000), P301 (1.500.000) => 4 phòng
        DebtFilterRequest filterMax1M5 = new DebtFilterRequest(null, null, null, null, 1_500_000L);
        DebtSummaryResponse resMax1M5 = debtService.getDebts(landlord, filterMax1M5, today);

        assertEquals(4, resMax1M5.totalRoomsWithDebt());
        assertTrue(resMax1M5.items().stream().allMatch(i -> i.totalRemainingDebt() <= 1_500_000L));
    }

    @Test
    @DisplayName("Tiêu chí 3: Có dòng tổng cộng số tiền còn thiếu của tập kết quả đang lọc")
    void testTotalRemainingDebtOfFilteredResults() {
        // Tổng nợ tất cả 7 phòng:
        // P101: 1.500.000
        // P102: 1.200.000
        // P201: 1.800.000
        // P202: 500.000
        // P301: 1.500.000
        // P302: 6.800.000
        // P401: 6.000.000
        // Tổng cộng = 19.300.000
        DebtSummaryResponse all = debtService.getDebts(landlord, null, today);
        assertEquals(19_300_000L, all.totalRemainingDebt(), "Tổng số tiền còn thiếu của tất cả phòng phải là 19.300.000");

        // Khi lọc Tòa A: 1.500.000 + 1.200.000 + 1.800.000 + 500.000 = 5.000.000
        DebtFilterRequest filterA = new DebtFilterRequest(10L, null, null, null, null);
        DebtSummaryResponse resA = debtService.getDebts(landlord, filterA, today);
        assertEquals(5_000_000L, resA.totalRemainingDebt(), "Dòng tổng cộng của tập kết quả Tòa A phải là 5.000.000");

        // Khi lọc Tòa B: 1.500.000 + 6.800.000 + 6.000.000 = 14.300.000
        DebtFilterRequest filterB = new DebtFilterRequest(20L, null, null, null, null);
        DebtSummaryResponse resB = debtService.getDebts(landlord, filterB, today);
        assertEquals(14_300_000L, resB.totalRemainingDebt(), "Dòng tổng cộng của tập kết quả Tòa B phải là 14.300.000");
    }

    @Test
    @DisplayName("Tiêu chí 4: Số liệu khớp 100% với bộ dữ liệu kiểm thử gồm ít nhất 5 trường hợp trả thiếu và 2 trường hợp quá hạn nhiều kỳ")
    void testDatasetCriteriaRequirements() {
        DebtSummaryResponse res = debtService.getDebts(landlord, null, today);

        // Kiểm tra số trường hợp trả thiếu (có 0 < paidAmount < totalAmount)
        long partialPaymentInvoices = testInvoices.stream()
                .filter(inv -> inv.getPaidAmount() > 0 && inv.getPaidAmount() < inv.getTotalAmount())
                .count();

        assertTrue(partialPaymentInvoices >= 5, "Bộ dữ liệu kiểm thử phải có ít nhất 5 trường hợp trả thiếu. Thực tế: " + partialPaymentInvoices);

        // Kiểm tra số trường hợp phòng quá hạn nhiều kỳ (có từ 2 hoá đơn chưa trả hết trở lên)
        long multiPeriodOverdueRooms = res.items().stream()
                .filter(item -> item.unpaidInvoiceCount() >= 2)
                .count();

        assertTrue(multiPeriodOverdueRooms >= 2, "Bộ dữ liệu kiểm thử phải có ít nhất 2 trường hợp quá hạn nhiều kỳ. Thực tế: " + multiPeriodOverdueRooms);
    }

    @Test
    @DisplayName("Tiêu chí 5: Xuất tệp CSV mã hoá UTF-8 có dấu tiếng Việt và chèn BOM '\\ufeff'")
    void testExportCsvWithUtf8BomAndVietnameseAccents() {
        byte[] csvBytes = debtService.exportCsv(landlord, null, today);

        assertNotNull(csvBytes);
        assertTrue(csvBytes.length > 3);

        // Kiểm tra 3 byte đầu tiên là BOM UTF-8 (0xEF, 0xBB, 0xBF)
        assertEquals((byte) 0xEF, csvBytes[0], "Byte 0 phải là 0xEF");
        assertEquals((byte) 0xBB, csvBytes[1], "Byte 1 phải là 0xBB");
        assertEquals((byte) 0xBF, csvBytes[2], "Byte 2 phải là 0xBF");

        // Chuyển phần thân sang chuỗi UTF-8 (bỏ 3 byte BOM)
        String csvContent = new String(csvBytes, 3, csvBytes.length - 3, StandardCharsets.UTF_8);

        // Kiểm tra các tiêu đề cột tiếng Việt có dấu
        assertTrue(csvContent.contains("Tòa nhà"), "CSV phải có cột 'Tòa nhà'");
        assertTrue(csvContent.contains("Người đứng tên"), "CSV phải có cột 'Người đứng tên'");
        assertTrue(csvContent.contains("Số HĐ chưa trả hết"), "CSV phải có cột 'Số HĐ chưa trả hết'");
        assertTrue(csvContent.contains("Tổng còn thiếu (VNĐ)"), "CSV phải có cột 'Tổng còn thiếu (VNĐ)'");
        assertTrue(csvContent.contains("Số ngày quá hạn dài nhất"), "CSV phải có cột 'Số ngày quá hạn dài nhất'");

        // Kiểm tra dữ liệu tiếng Việt có dấu
        assertTrue(csvContent.contains("Tòa Nhà A - Cầu Giấy"));
        assertTrue(csvContent.contains("Nguyễn Văn An"));
        assertTrue(csvContent.contains("Trần Thị Bình"));
        assertTrue(csvContent.contains("Vũ Tuấn Em"));

        // Kiểm tra dòng tổng cộng trong CSV
        assertTrue(csvContent.contains("\"TỔNG CỘNG\""), "CSV phải có dòng 'TỔNG CỘNG'");
        assertTrue(csvContent.contains("19300000"), "CSV phải chứa tổng còn thiếu 19.300.000");
    }
}
