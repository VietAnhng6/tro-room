package com.troroom.backend.service;

import com.troroom.backend.dto.LandlordRequestItem;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.LandlordRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class LandlordRequestService {
    private final LandlordRequestRepository repository;

    public LandlordRequestService(LandlordRequestRepository repository) {
        this.repository = repository;
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