
package com.troroom.backend.service;

import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RentalRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
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
        public List<RentalContract> listContractsByLandlord(Long landlordId) {
    return contractRepository
            .findByRoom_Building_Landlord_IdOrderByStartDateDesc(landlordId);
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
        // 1. Kiểm tra tài khoản chủ nhà
        if (landlord == null || landlord.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập bằng tài khoản chủ nhà"
            );
        }

        if (requestId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID yêu cầu thuê không hợp lệ"
            );
        }

        // 2. Kiểm tra dữ liệu hợp đồng
        if (deposit < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tiền cọc không được âm"
            );
        }

        if (startDate == null || startDate.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu không được để trống hoặc ở quá khứ"
            );
        }

        if (termMonths < 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thời hạn hợp đồng phải ít nhất 1 tháng"
            );
        }

        if (billingCutoffDay < 1 || billingCutoffDay > 28) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày chốt hóa đơn phải từ 1 đến 28"
            );
        }

        if (initialElectricity == null || initialElectricity < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ số điện đầu kỳ không hợp lệ"
            );
        }

        if (initialWater == null || initialWater < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ số nước đầu kỳ không hợp lệ"
            );
        }

        // 3. Tìm yêu cầu thuê
        RentalRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy yêu cầu thuê"
                ));

        if (request.getType() != RentalRequest.Type.RENT_NOW) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ có thể lập hợp đồng từ yêu cầu thuê phòng"
            );
        }

        if (request.getStatus() != RentalRequest.Status.ACCEPTED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Yêu cầu chưa được duyệt hoặc đã được xử lý"
            );
        }

        // 4. Lấy phòng và kiểm tra quyền chủ nhà
        Listing listing = request.getListing();
        Room room = listing.getRoom();
        User roomLandlord = room.getBuilding().getLandlord();

        if (roomLandlord == null
                || !roomLandlord.getId().equals(landlord.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền lập hợp đồng cho yêu cầu này"
            );
        }

        // 5. Giá thuê luôn lấy từ phòng trong cơ sở dữ liệu
        long rent = room.getRent();

        if (rent <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giá thuê phòng phải lớn hơn 0"
            );
        }

        if (rent > Long.MAX_VALUE / 3 || deposit > rent * 3) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tiền cọc phải từ 0 đến tối đa 3 tháng tiền thuê"
            );
        }

        // 6. Kiểm tra hợp đồng đã tồn tại
        if (contractRepository.findByRequestId(requestId).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Yêu cầu này đã có hợp đồng"
            );
        }

        // 7. Phòng phải ở trạng thái đã đặt cọc
        if (room.getStatus() != Room.Status.DEPOSITED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Phòng không ở trạng thái đã đặt cọc"
            );
        }

        // 8. Tính ngày kết thúc
        LocalDate endDate;
        try {
            endDate = startDate.plusMonths(termMonths);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thời hạn hợp đồng không hợp lệ"
            );
        }

        if (!endDate.isAfter(startDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày kết thúc hợp đồng không hợp lệ"
            );
        }

        // 9. Kiểm tra hợp đồng trùng thời gian
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

        // 10. Tạo hợp đồng
        RentalContract contract = new RentalContract();
        contract.setContractCode(generateContractCode());
        contract.setRequest(request);
        contract.setTenant(request.getTenant());
        contract.setRoom(room);
        contract.setRent(rent);
        contract.setDeposit(deposit);
        contract.setStartDate(startDate);
        contract.setTermMonths(termMonths);
        contract.setEndDate(endDate);
        contract.setBillingCutoffDay(billingCutoffDay);
        contract.setInitialElectricity(initialElectricity);
        contract.setInitialWater(initialWater);
        contract.setCreatedAt(LocalDateTime.now());

        RentalContract savedContract = contractRepository.save(contract);

        // 11. Cập nhật trạng thái
        room.setStatus(Room.Status.RENTED);
        listing.setStatus(Listing.Status.RENTED);
        request.setStatus(RentalRequest.Status.COMPLETED);
        requestRepository.save(request);

        return savedContract;
    }

    /**
     * Sinh mã hợp đồng dạng HD-2026-0001.
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
