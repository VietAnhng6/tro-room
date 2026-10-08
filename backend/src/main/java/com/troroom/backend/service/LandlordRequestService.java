package com.troroom.backend.service;

import com.troroom.backend.dto.LandlordRequestItem;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.RentalRequestHistory;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.LandlordRequestRepository;
import com.troroom.backend.repository.RentalRequestHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class LandlordRequestService {
    private static final int CONFLICT_MINUTES = 30;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private final NotificationService notificationService;
    private final LandlordRequestRepository repository;
    private final RentalRequestHistoryRepository historyRepository;

    public LandlordRequestService(LandlordRequestRepository repository,
                              RentalRequestHistoryRepository historyRepository,
                              NotificationService notificationService) {
    this.repository = repository;
    this.historyRepository = historyRepository;
    this.notificationService = notificationService;
    }

    /** Danh sách yêu cầu của các toà nhà thuộc Chủ nhà; mặc định mới nhất lên đầu. */
    @Transactional(readOnly = true)
    public List<LandlordRequestItem> list(User landlord, RentalRequest.Status status,
                                          Long buildingId, boolean oldestFirst) {
        LocalDateTime limit = LocalDateTime.now().minusHours(24);
        List<LandlordRequestItem> result = new ArrayList<>(repository.findAllForLandlord(landlord).stream()
                .filter(r -> status == null || r.getStatus() == status)
                .filter(r -> buildingId == null
                        || r.getListing().getRoom().getBuilding().getId().equals(buildingId))
                .map(r -> toItem(r, limit))
                .toList());
        if (oldestFirst) Collections.reverse(result);
        return result;
    }

    /** Số yêu cầu chưa xử lý (trạng thái Mới) để hiện trên menu. */
    @Transactional(readOnly = true)
    public long pendingCount(User landlord) {
        return repository.countByListing_Room_Building_LandlordAndStatus(landlord, RentalRequest.Status.OPEN);
    }

    /**
     * S2-08: xác nhận lịch xem phòng (Mới -> Đã hẹn lịch) hoặc đổi lịch (Đã hẹn lịch -> Đã hẹn lịch).
     * Nếu cùng phòng đã có lịch khác trong khoảng 30 phút thì chỉ CẢNH BÁO (409 SCHEDULE_CONFLICT);
     * gửi lại với force = true để vẫn xác nhận.
     */
    @Transactional
    public LandlordRequestItem schedule(User landlord, Long requestId, LocalDateTime scheduledAt, boolean force) {
        if (scheduledAt == null) {
            throw badRequest("Phải chọn ngày giờ hẹn cụ thể");
        }
        if (!scheduledAt.isAfter(LocalDateTime.now())) {
            throw badRequest("Giờ hẹn phải nằm trong tương lai");
        }
        RentalRequest r = load(landlord, requestId);
        if (r.getType() != RentalRequest.Type.VIEWING) {
            throw badRequest("Chỉ yêu cầu xem phòng mới có lịch hẹn");
        }
        if (r.getStatus() != RentalRequest.Status.OPEN && r.getStatus() != RentalRequest.Status.SCHEDULED) {
            throw invalidState("Yêu cầu đã được xử lý, không thể hẹn lịch");
        }

        if (!force) {
            long conflicts = repository.countScheduleConflicts(
                    r.getListing().getRoom().getId(), RentalRequest.Status.SCHEDULED, r.getId(),
                    scheduledAt.minusMinutes(CONFLICT_MINUTES), scheduledAt.plusMinutes(CONFLICT_MINUTES));
            if (conflicts > 0) {
                throw new RequestActionException(HttpStatus.CONFLICT, "SCHEDULE_CONFLICT",
                        "Phòng này đã có lịch hẹn khác trong khoảng " + CONFLICT_MINUTES
                                + " phút. Bạn vẫn muốn xác nhận lịch này?");
            }
        }

        boolean reschedule = r.getStatus() == RentalRequest.Status.SCHEDULED;
        String from = r.getStatus().name();
        r.setScheduledAt(scheduledAt);
        r.setStatus(RentalRequest.Status.SCHEDULED);
        repository.save(r);
        historyRepository.save(new RentalRequestHistory(r, from, RentalRequest.Status.SCHEDULED.name(), landlord,
        (reschedule ? "Đổi lịch xem phòng sang " : "Xác nhận lịch xem phòng lúc ") + TIME_FMT.format(scheduledAt)));

    notificationService.notifyRequestScheduled(r);

    return toItem(r, LocalDateTime.now().minusHours(24));
        }

    /**
     * S2-08: duyệt yêu cầu Thuê ngay (Mới -> Đã duyệt) và chuyển phòng sang Đã đặt cọc.
     * Chỉ duyệt được khi phòng đang trống.
     */
    @Transactional
    public LandlordRequestItem approve(User landlord, Long requestId) {
        RentalRequest r = load(landlord, requestId);
        if (r.getType() != RentalRequest.Type.RENT_NOW) {
            throw badRequest("Yêu cầu xem phòng được xử lý bằng cách xác nhận lịch hẹn");
        }
        if (r.getStatus() != RentalRequest.Status.OPEN) {
            throw invalidState("Yêu cầu đã được xử lý");
        }
        Room room = r.getListing().getRoom();
        if (room.getStatus() != Room.Status.EMPTY) {
            throw new RequestActionException(HttpStatus.CONFLICT, "ROOM_UNAVAILABLE", "Phòng không còn trống");
        }

        // room đã được nạp trong transaction này nên JPA tự lưu thay đổi khi commit
        room.setStatus(Room.Status.DEPOSITED);
        String from = r.getStatus().name();
        r.setStatus(RentalRequest.Status.ACCEPTED);
        repository.save(r);
        historyRepository.save(new RentalRequestHistory(r, from, RentalRequest.Status.ACCEPTED.name(), landlord,
                "Duyệt yêu cầu thuê, phòng chuyển sang Đã đặt cọc"));
        return toItem(r, LocalDateTime.now().minusHours(24));
    }

    /**
     * S2-08: từ chối (Mới hoặc Đã hẹn lịch -> Từ chối). Bắt buộc có lý do;
     * lý do "Khác" bắt buộc kèm ghi chú.
     */
    @Transactional
    public LandlordRequestItem reject(User landlord, Long requestId, String reason, String note) {
        if (reason == null || reason.isBlank()) {
            throw badRequest("Phải chọn lý do từ chối");
        }
        RentalRequest.RejectReason rr;
        try {
            rr = RentalRequest.RejectReason.valueOf(reason.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw badRequest("Lý do từ chối không hợp lệ");
        }
        String cleanNote = note == null ? "" : note.trim();
        if (rr == RentalRequest.RejectReason.OTHER && cleanNote.isEmpty()) {
            throw badRequest("Chọn lý do khác thì phải ghi chú thêm");
        }

        RentalRequest r = load(landlord, requestId);
        if (r.getStatus() != RentalRequest.Status.OPEN && r.getStatus() != RentalRequest.Status.SCHEDULED) {
            throw invalidState("Yêu cầu đã được xử lý, không thể từ chối");
        }

        String from = r.getStatus().name();
        r.setRejectReason(rr);
        r.setRejectNote(cleanNote.isEmpty() ? null : cleanNote);
        r.setStatus(RentalRequest.Status.REJECTED);
        repository.save(r);
        historyRepository.save(new RentalRequestHistory(r, from, RentalRequest.Status.REJECTED.name(), landlord,
        "Từ chối - " + rejectLabel(rr) + (cleanNote.isEmpty() ? "" : ": " + cleanNote)));

    notificationService.notifyRequestRejected(r);

    return toItem(r, LocalDateTime.now().minusHours(24));
    }

    private RentalRequest load(User landlord, Long requestId) {
        return repository.findByIdForLandlord(requestId, landlord)
                .orElseThrow(() -> new RequestActionException(HttpStatus.NOT_FOUND, "NOT_FOUND",
                        "Không tìm thấy yêu cầu"));
    }

    private static RequestActionException badRequest(String message) {
        return new RequestActionException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message);
    }

    private static RequestActionException invalidState(String message) {
        return new RequestActionException(HttpStatus.CONFLICT, "INVALID_STATE", message);
    }

    private static String rejectLabel(RentalRequest.RejectReason reason) {
        return switch (reason) {
            case ALREADY_RENTED -> "Đã có khách thuê";
            case PEOPLE_MISMATCH -> "Không phù hợp số người";
            case UNREACHABLE -> "Khách không liên lạc được";
            case OTHER -> "Lý do khác";
        };
    }

    private LandlordRequestItem toItem(RentalRequest r, LocalDateTime overdueLimit) {
        var room = r.getListing().getRoom();
        var building = room.getBuilding();
        boolean overdue = r.getStatus() == RentalRequest.Status.OPEN && r.getCreatedAt().isBefore(overdueLimit);
        return new LandlordRequestItem(
                r.getId(), r.getRequestCode(),
                r.getTenant().getName(), r.getTenant().getPhone(),
                room.getId(), room.getCode(),
                building.getId(), building.getName(),
                r.getType().name(), r.getDesiredDate(), r.getExpectedPeople(),
                r.getMessage() == null ? "" : r.getMessage(),
                r.getStatus().name(), r.getScheduledAt(), r.getCreatedAt(),
                overdue);
    }
}