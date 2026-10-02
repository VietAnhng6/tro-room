package com.troroom.backend.service;

import com.troroom.backend.dto.RequestHistoryItem;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.LandlordRequestRepository;
import com.troroom.backend.repository.RentalRequestHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;

/** S2-08: lịch sử đổi trạng thái của một yêu cầu thuê, cho Chủ nhà và cho Khách thuê. */
@Service
public class RequestHistoryService {
    private final LandlordRequestRepository requestRepository;
    private final RentalRequestHistoryRepository historyRepository;

    public RequestHistoryService(LandlordRequestRepository requestRepository,
                                 RentalRequestHistoryRepository historyRepository) {
        this.requestRepository = requestRepository;
        this.historyRepository = historyRepository;
    }

    /** Chủ nhà chỉ xem được lịch sử yêu cầu thuộc toà nhà của mình. */
    @Transactional(readOnly = true)
    public List<RequestHistoryItem> historyForLandlord(User landlord, Long requestId) {
        RentalRequest r = requestRepository.findByIdForLandlord(requestId, landlord)
                .orElseThrow(RequestHistoryService::notFound);
        return build(r);
    }

    /** Khách thuê chỉ xem được lịch sử yêu cầu do chính mình gửi. */
    @Transactional(readOnly = true)
    public List<RequestHistoryItem> historyForTenant(User tenant, Long requestId) {
        RentalRequest r = requestRepository.findById(requestId)
                .filter(x -> x.getTenant().getId().equals(tenant.getId()))
                .orElseThrow(RequestHistoryService::notFound);
        return build(r);
    }

    /**
     * Dòng đầu "Đã gửi yêu cầu" lấy từ thời điểm tạo yêu cầu (S2-06 không ghi vào bảng lịch sử),
     * các dòng sau là những lần Chủ nhà đổi trạng thái.
     */
    private List<RequestHistoryItem> build(RentalRequest r) {
        List<RequestHistoryItem> items = new ArrayList<>();
        items.add(new RequestHistoryItem(null, RentalRequest.Status.OPEN.name(),
                r.getTenant().getName(), "Đã gửi yêu cầu", r.getCreatedAt()));
        historyRepository.findByRequestOrderByCreatedAtAsc(r).forEach(h ->
                items.add(new RequestHistoryItem(h.getFromStatus(), h.getToStatus(),
                        h.getActor().getName(), h.getNote(), h.getCreatedAt())));
        return items;
    }

    private static RequestActionException notFound() {
        return new RequestActionException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy yêu cầu");
    }
}