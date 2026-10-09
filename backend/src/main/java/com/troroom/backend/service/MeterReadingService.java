package com.troroom.backend.service;

import com.troroom.backend.dto.MeterReadingDtos.*;
import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.MeterReading;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.MeterReadingRepository;
import com.troroom.backend.repository.RentalContractRepository;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * S3-05: Quản lý toà nhà nhập chỉ số điện nước cuối kỳ.
 *
 * Quản lý toà nhà chỉ thao tác trên toà mình phụ trách; chủ nhà thao tác
 * trên toà mình sở hữu. Kiểm tra quyền thực hiện ở tầng backend.
 */
@Service
public class MeterReadingService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final BuildingRepository buildingRepository;
    private final RentalContractRepository contractRepository;
    private final MeterReadingRepository meterRepository;
    private final AuditLogService auditLogService;

    public MeterReadingService(
            BuildingRepository buildingRepository,
            RentalContractRepository contractRepository,
            MeterReadingRepository meterRepository,
            AuditLogService auditLogService) {
        this.buildingRepository = buildingRepository;
        this.contractRepository = contractRepository;
        this.meterRepository = meterRepository;
        this.auditLogService = auditLogService;
    }

    // ---------------------------------------------------------------
    // Quyền và phạm vi toà nhà
    // ---------------------------------------------------------------

    private List<Building> accessibleBuildings(User user) {
        List<Building> buildings;
        if (user.getRole() == User.Role.MANAGER) {
            buildings = buildingRepository.findByManager(user);
        } else if (user.getRole() == User.Role.LANDLORD) {
            buildings = buildingRepository.findByLandlord(user);
        } else {
            throw new MeterReadingException(403, "FORBIDDEN",
                    "Chỉ Quản lý toà nhà hoặc Chủ nhà được nhập chỉ số điện nước");
        }
        return buildings.stream().filter(Building::isActive).toList();
    }

    private void requireBuilding(User user, Long buildingId) {
        boolean ok = accessibleBuildings(user).stream()
                .anyMatch(b -> b.getId().equals(buildingId));
        if (!ok) {
            throw new MeterReadingException(403, "FORBIDDEN",
                    "Bạn không phụ trách toà nhà này");
        }
    }

    private static YearMonth parsePeriod(String period) {
        if (period == null || period.isBlank()) {
            return YearMonth.now(ZONE);
        }
        try {
            return YearMonth.parse(period.trim());
        } catch (DateTimeParseException e) {
            throw new MeterReadingException(400, "INVALID_PERIOD",
                    "Kỳ ghi không hợp lệ, cần dạng yyyy-MM");
        }
    }

    // ---------------------------------------------------------------
    // Truy vấn
    // ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<BuildingItem> buildings(User user) {
        return accessibleBuildings(user).stream()
                .map(b -> new BuildingItem(b.getId(), b.getName(), b.getAddress()))
                .toList();
    }

    /** Danh sách phòng đang thuê của toà theo thứ tự tầng, mã phòng, kèm chỉ số kỳ trước. */
    @Transactional(readOnly = true)
    public ListResponse list(User user, Long buildingId, String periodText) {
        requireBuilding(user, buildingId);
        YearMonth period = parsePeriod(periodText);
        String key = period.toString();

        List<RentalContract> contracts = contractRepository.findActiveForMeter(
                buildingId, period.atDay(1), period.atEndOfMonth());

        Map<Long, MeterReading> current = contracts.isEmpty()
                ? Map.of()
                : meterRepository.findByContractInAndPeriod(contracts, key).stream()
                .collect(Collectors.toMap(m -> m.getContract().getId(), Function.identity()));

        List<RoomItem> rooms = new ArrayList<>();
        for (RentalContract c : contracts) {
            rooms.add(toItem(c, key, current.get(c.getId())));
        }
        return summarize(buildingId, key, rooms);
    }

    private ListResponse summarize(Long buildingId, String period, List<RoomItem> rooms) {
        int recorded = (int) rooms.stream().filter(RoomItem::recorded).count();
        return new ListResponse(buildingId, period, rooms.size(), recorded,
                rooms.size() - recorded, rooms);
    }

    /** Chỉ số kỳ trước: bản ghi gần nhất của hợp đồng, nếu chưa có thì chỉ số đầu kỳ của hợp đồng. */
    private int[] baseline(RentalContract contract, String period) {
        Optional<MeterReading> last = meterRepository
                .findFirstByContractAndPeriodLessThanOrderByPeriodDesc(contract, period);
        if (last.isPresent()) {
            return new int[]{last.get().getElectricity(), last.get().getWater()};
        }
        int e = contract.getInitialElectricity() == null ? 0 : contract.getInitialElectricity();
        int w = contract.getInitialWater() == null ? 0 : contract.getInitialWater();
        return new int[]{e, w};
    }

    private RoomItem toItem(RentalContract c, String period, MeterReading reading) {
        Room room = c.getRoom();
        int[] base = reading != null
                ? new int[]{reading.getElectricityPrev(), reading.getWaterPrev()}
                : baseline(c, period);
        return new RoomItem(
                c.getId(), room.getId(), room.getCode(), room.getFloor(),
                c.getTenant().getName(),
                base[0], base[1],
                reading == null ? null : reading.getElectricity(),
                reading == null ? null : reading.getWater(),
                reading != null);
    }

    // ---------------------------------------------------------------
    // Lưu từng phòng
    // ---------------------------------------------------------------

    @Transactional
    public SaveResponse save(User user, SaveRequest req) {
        if (req == null || req.contractId() == null) {
            throw new MeterReadingException(400, "VALIDATION", "Thiếu hợp đồng cần ghi chỉ số");
        }
        YearMonth period = parsePeriod(req.period());
        String key = period.toString();

        RentalContract contract = contractRepository.findById(req.contractId())
                .orElseThrow(() -> new MeterReadingException(404, "NOT_FOUND",
                        "Không tìm thấy hợp đồng"));
        Room room = contract.getRoom();
        Long buildingId = room.getBuilding().getId();
        requireBuilding(user, buildingId);

        LocalDate start = period.atDay(1);
        LocalDate end = period.atEndOfMonth();
        if (room.getStatus() != Room.Status.RENTED
                || contract.getStartDate().isAfter(end)
                || contract.getEndDate().isBefore(start)) {
            throw new MeterReadingException(409, "CONTRACT_NOT_ACTIVE",
                    "Phòng không có hợp đồng đang hiệu lực trong kỳ " + key);
        }

        // Không cho sửa kỳ cũ khi đã có kỳ sau, tránh làm lệch chỉ số kỳ trước của kỳ sau.
        if (meterRepository.existsByContractAndPeriodGreaterThan(contract, key)) {
            throw new MeterReadingException(409, "LATER_PERIOD_EXISTS",
                    "Đã có chỉ số của kỳ sau, không thể sửa kỳ " + key);
        }

        Optional<MeterReading> existing = meterRepository.findByContractAndPeriod(contract, key);
        int[] base = existing
                .map(m -> new int[]{m.getElectricityPrev(), m.getWaterPrev()})
                .orElseGet(() -> baseline(contract, key));

        // Kiểm tra cứng: lỗi gắn đúng trường để giao diện báo ngay tại dòng.
        Map<String, String> fieldErrors = new HashMap<>();
        String eErr = MeterReadingRules.validate("điện", base[0], req.electricity());
        String wErr = MeterReadingRules.validate("nước", base[1], req.water());
        if (eErr != null) fieldErrors.put("electricity", eErr);
        if (wErr != null) fieldErrors.put("water", wErr);
        if (!fieldErrors.isEmpty()) {
            throw new MeterReadingException(400, "VALIDATION",
                    String.join("; ", fieldErrors.values()),
                    Map.of("fields", fieldErrors));
        }

        // Cảnh báo mềm: tiêu thụ chênh quá 200% so với trung bình 3 kỳ gần nhất.
        List<MeterReading> history = meterRepository
                .findTop3ByContractAndPeriodLessThanOrderByPeriodDesc(contract, key);
        List<Map<String, Object>> warnings = new ArrayList<>();
        addWarning(warnings, "electricity", "điện", req.electricity() - base[0],
                history.stream().map(MeterReading::electricityUsed).toList());
        addWarning(warnings, "water", "nước", req.water() - base[1],
                history.stream().map(MeterReading::waterUsed).toList());
        if (!warnings.isEmpty() && !Boolean.TRUE.equals(req.confirm())) {
            throw new MeterReadingException(409, "CONSUMPTION_WARNING",
                    "Mức tiêu thụ cao bất thường, cần xác nhận trước khi lưu",
                    Map.of("warnings", warnings));
        }

        MeterReading reading = existing.orElseGet(MeterReading::new);
        Map<String, Object> before = existing.isPresent()
                ? Map.of("electricity", reading.getElectricity(), "water", reading.getWater())
                : null;

        reading.setContract(contract);
        reading.setRoom(room);
        reading.setPeriod(key);
        reading.setElectricityPrev(base[0]);
        reading.setWaterPrev(base[1]);
        reading.setElectricity(req.electricity());
        reading.setWater(req.water());
        reading.setRecordedBy(user);
        reading.setRecordedAt(LocalDateTime.now(ZONE));

        MeterReading saved;
        try {
            saved = meterRepository.saveAndFlush(reading);
        } catch (OptimisticLockingFailureException e) {
            throw new MeterReadingException(409, "CONFLICT",
                    "Dữ liệu vừa được người khác thay đổi, vui lòng tải lại");
        }

        auditLogService.log(
                user,
                existing.isPresent() ? "UPDATE" : "CREATE",
                "MeterReading",
                saved.getId(),
                before,
                Map.of("roomCode", room.getCode(), "period", key,
                        "electricity", saved.getElectricity(), "water", saved.getWater()));

        // Trả lại dòng vừa lưu và số liệu tiến độ mới của toà.
        ListResponse summary = list(user, buildingId, key);
        RoomItem item = summary.rooms().stream()
                .filter(r -> r.contractId().equals(contract.getId()))
                .findFirst()
                .orElseGet(() -> toItem(contract, key, saved));
        return new SaveResponse(item, summary.total(), summary.recorded(), summary.remaining());
    }

    private void addWarning(List<Map<String, Object>> warnings, String field, String label,
                            int used, List<Integer> history) {
        if (MeterReadingRules.isAbnormal(used, history)) {
            double avg = MeterReadingRules.average(history);
            Map<String, Object> w = new HashMap<>();
            w.put("field", field);
            w.put("message", "Mức " + label + " tiêu thụ " + used
                    + " cao hơn 200% so với trung bình " + Math.round(avg) + " của các kỳ gần nhất");
            w.put("used", used);
            w.put("average", Math.round(avg));
            warnings.add(w);
        }
    }
}
