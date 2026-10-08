package com.troroom.backend.service;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RentalRequestRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class RentalContractService {

    private final RentalContractRepository contractRepository;
    private final RentalRequestRepository requestRepository;

    public RentalContractService(
            RentalContractRepository contractRepository,
            RentalRequestRepository requestRepository
    ) {
        this.contractRepository = contractRepository;
        this.requestRepository = requestRepository;
    }

    @Transactional
    public RentalContract createContract(
            User landlord,
            Long requestId,
            long deposit,
            LocalDate startDate,
            int termMonths,
            int billingCutoffDay,
            Integer initialElectricity,
            Integer initialWater
    ) {
        // 1. Tìm yêu cầu thuê
        RentalRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy yêu cầu thuê"
                ));

        // 2. Chỉ lập hợp đồng từ yêu cầu RENT_NOW
        if (request.getType() != RentalRequest.Type.RENT_NOW) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ có thể lập hợp đồng từ yêu cầu thuê phòng"
            );
        }

        // 3. Yêu cầu phải được chủ nhà duyệt
        if (request.getStatus() != RentalRequest.Status.ACCEPTED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Yêu cầu chưa được duyệt hoặc đã được xử lý"
            );
        }

        // 4. Kiểm tra đúng chủ nhà của phòng
        User roomLandlord = request.getListing()
                .getRoom()
                .getBuilding()
                .getLandlord();

        if (roomLandlord == null
                || landlord == null
                || !roomLandlord.getId().equals(landlord.getId())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền lập hợp đồng cho yêu cầu này"
            );
        }

        // 5. Một yêu cầu chỉ được lập một hợp đồng
        if (contractRepository.findByRequestId(requestId).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Yêu cầu này đã có hợp đồng"
            );
        }

        // 6. Lấy phòng từ listing
        Room room = request.getListing().getRoom();

        // 7. Phòng phải đang ở trạng thái Đã đặt cọc
        if (room.getStatus() != Room.Status.DEPOSITED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Phòng không ở trạng thái đã đặt cọc"
            );
        }

        // 8. Kiểm tra ngày bắt đầu
        if (startDate == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu không được để trống"
            );
        }

        if (startDate.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu không được ở quá khứ"
            );
        }

        // 9. Kiểm tra thời hạn
        if (termMonths <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thời hạn hợp đồng phải lớn hơn 0 tháng"
            );
        }

        // 10. Tiền cọc: từ 0 đến tối đa 3 tháng tiền thuê
        long maxDeposit = room.getRent() * 3;

        if (deposit < 0 || deposit > maxDeposit) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tiền cọc phải từ 0 đến tối đa 3 tháng tiền thuê"
            );
        }

        // 11. Ngày chốt hóa đơn từ 1 đến 28
        if (billingCutoffDay < 1 || billingCutoffDay > 28) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày chốt hóa đơn phải từ 1 đến 28"
            );
        }

        // 12. Chỉ số điện nước đầu kỳ không được âm
        if (initialElectricity != null && initialElectricity < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ số điện đầu kỳ không hợp lệ"
            );
        }

        if (initialWater != null && initialWater < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ số nước đầu kỳ không hợp lệ"
            );
        }

        // 13. Tự tính ngày kết thúc
        LocalDate endDate = startDate.plusMonths(termMonths);

        // 14. Không cho phép hợp đồng khác bị trùng thời gian
        boolean overlapping = contractRepository
        .existsByRoomAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
                room,
                startDate,
                endDate
        );

        if (overlapping) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Phòng đã có hợp đồng bị trùng thời gian"
            );
        }

        // 15. Tạo hợp đồng
        RentalContract contract = new RentalContract();

        contract.setContractCode(generateContractCode());
        contract.setRequest(request);
        contract.setTenant(request.getTenant());
        contract.setRoom(room);
        contract.setRent(room.getRent());
        contract.setDeposit(deposit);
        contract.setStartDate(startDate);
        contract.setTermMonths(termMonths);
        contract.setEndDate(endDate);
        contract.setBillingCutoffDay(billingCutoffDay);
        contract.setInitialElectricity(initialElectricity);
        contract.setInitialWater(initialWater);
        contract.setCreatedAt(LocalDateTime.now());

        // 16. Lưu hợp đồng
        RentalContract savedContract = contractRepository.save(contract);

        room.setStatus(Room.Status.RENTED);

        Listing listing = request.getListing();
        listing.setStatus(Listing.Status.RENTED);

        // Hợp đồng đã được lập → yêu cầu hoàn tất
        request.setStatus(RentalRequest.Status.COMPLETED);
        requestRepository.save(request);

        return savedContract;
    }

    /**
     * Sinh mã hợp đồng dạng:
     * HD-2026-0001
     */
    private String generateContractCode() {
        int year = Year.now().getValue();

        for (int i = 0; i < 100; i++) {

            int number = ThreadLocalRandom.current()
                    .nextInt(1, 10000);

            String code = String.format(
                    "HD-%d-%04d",
                    year,
                    number
            );

            if (!contractRepository.existsByContractCode(code)) {
                return code;
            }
        }

        throw new IllegalStateException(
                "Không thể tạo mã hợp đồng"
        );
    }
}