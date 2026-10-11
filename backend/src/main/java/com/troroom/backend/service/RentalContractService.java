package com.troroom.backend.service;

import com.troroom.backend.entity.ContractRenewal;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ContractRenewalRepository;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RentalRequestRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class RentalContractService {

    private final RentalContractRepository contractRepository;
    private final RentalRequestRepository requestRepository;
    private final ContractRenewalRepository renewalRepository;

    public RentalContractService(
            RentalContractRepository contractRepository,
            RentalRequestRepository requestRepository,
            ContractRenewalRepository renewalRepository
    ) {
        this.contractRepository = contractRepository;
        this.requestRepository = requestRepository;
        this.renewalRepository = renewalRepository;
    }

    @Transactional(readOnly = true)
    public List<RentalContract> listContractsByLandlord(Long landlordId) {
        if (landlordId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID chủ nhà không hợp lệ"
            );
        }

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
        validateLandlord(landlord);

        if (requestId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID yêu cầu thuê không hợp lệ"
            );
        }

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

        if (termMonths < 1 || termMonths > 120) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thời hạn hợp đồng phải từ 1 đến 120 tháng"
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

        Listing listing = request.getListing();

        if (listing == null || listing.getRoom() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Yêu cầu thuê chưa liên kết với phòng"
            );
        }

        Room room = listing.getRoom();

        if (room.getBuilding() == null
                || room.getBuilding().getLandlord() == null
                || !room.getBuilding().getLandlord().getId().equals(landlord.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền lập hợp đồng cho yêu cầu này"
            );
        }

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

        if (contractRepository.findByRequestId(requestId).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Yêu cầu này đã có hợp đồng"
            );
        }

        if (room.getStatus() != Room.Status.DEPOSITED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Phòng không ở trạng thái đã đặt cọc"
            );
        }

        LocalDate endDate;

        try {
            // Giữ nguyên quy ước ngày kết thúc hiện tại của dự án.
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

        room.setStatus(Room.Status.RENTED);
        listing.setStatus(Listing.Status.RENTED);
        request.setStatus(RentalRequest.Status.COMPLETED);
        requestRepository.save(request);

        return savedContract;
    }

    /**
     * Gia hạn hợp đồng.
     *
     * Giá thuê gốc của hợp đồng không bị thay đổi.
     * Giá thuê của từng lần gia hạn được lưu trong ContractRenewal
     * để có thể áp dụng theo từng kỳ hóa đơn.
     */
    @Transactional
    public ContractRenewal renewContract(
            User landlord,
            Long contractId,
            Integer termMonths,
            Long newRent
    ) {
        validateLandlord(landlord);

        if (contractId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID hợp đồng không hợp lệ"
            );
        }

        if (termMonths == null || termMonths < 1 || termMonths > 120) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thời hạn gia hạn phải từ 1 đến 120 tháng"
            );
        }

        RentalContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hợp đồng"
                ));

        validateContractOwnership(landlord, contract);

        if (contract.getEndDate() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hợp đồng chưa có ngày kết thúc"
            );
        }

        if (contract.getRent() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giá thuê gốc của hợp đồng không hợp lệ"
            );
        }

        List<ContractRenewal> previousRenewals =
                renewalRepository.findByContract_IdOrderByStartDateAsc(contractId);

        long defaultRent = contract.getRent();

        if (!previousRenewals.isEmpty()) {
            ContractRenewal latestRenewal =
                    previousRenewals.get(previousRenewals.size() - 1);

            if (latestRenewal.getRent() > 0) {
                defaultRent = latestRenewal.getRent();
            }
        }

        long rent = newRent == null ? defaultRent : newRent;

        if (rent <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giá thuê mới phải lớn hơn 0"
            );
        }

        LocalDate renewalStart;
        LocalDate renewalEnd;

        try {
            renewalStart = contract.getEndDate().plusDays(1);
            renewalEnd = renewalStart.plusMonths(termMonths).minusDays(1);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thời hạn gia hạn không hợp lệ"
            );
        }

        if (renewalEnd.isBefore(renewalStart)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày kết thúc gia hạn không hợp lệ"
            );
        }

        if (contract.getRoom() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hợp đồng chưa được liên kết với phòng"
            );
        }

        boolean overlapping = contractRepository
                .existsOverlappingContractExcludingCurrent(
                        contract.getRoom(),
                        contract.getId(),
                        renewalStart,
                        renewalEnd
                );

        if (overlapping) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Thời gian gia hạn bị trùng với hợp đồng khác"
            );
        }

        ContractRenewal renewal = new ContractRenewal();
        renewal.setContract(contract);
        renewal.setStartDate(renewalStart);
        renewal.setEndDate(renewalEnd);
        renewal.setTermMonths(termMonths);
        renewal.setRent(rent);
        renewal.setRenewedBy(landlord);
        renewal.setCreatedAt(LocalDateTime.now());

        ContractRenewal savedRenewal = renewalRepository.save(renewal);

        // Chỉ cập nhật thời hạn; giữ nguyên giá thuê gốc để bảo toàn lịch sử.
        contract.setEndDate(renewalEnd);

        int currentTerm = contract.getTermMonths();

        if (currentTerm < 0 || currentTerm > Integer.MAX_VALUE - termMonths) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tổng thời hạn hợp đồng vượt giới hạn cho phép"
            );
        }

        contract.setTermMonths(currentTerm + termMonths);
        contractRepository.save(contract);

        return savedRenewal;
    }

    /**
     * Lấy lịch sử gia hạn của hợp đồng thuộc chủ nhà đang đăng nhập.
     */
    @Transactional(readOnly = true)
    public List<ContractRenewal> getRenewalHistory(
            User landlord,
            Long contractId
    ) {
        validateLandlord(landlord);

        if (contractId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID hợp đồng không hợp lệ"
            );
        }

        RentalContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hợp đồng"
                ));

        validateContractOwnership(landlord, contract);

        return renewalRepository
                .findByContract_IdOrderByStartDateAsc(contractId);
    }

    private void validateLandlord(User landlord) {
        if (landlord == null
                || landlord.getId() == null
                || landlord.getRole() != User.Role.LANDLORD) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà mới được thực hiện thao tác này"
            );
        }
    }

    private void validateContractOwnership(
            User landlord,
            RentalContract contract
    ) {
        if (contract.getRoom() == null
                || contract.getRoom().getBuilding() == null
                || contract.getRoom().getBuilding().getLandlord() == null
                || !contract.getRoom().getBuilding().getLandlord()
                        .getId().equals(landlord.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thao tác với hợp đồng này"
            );
        }
    }

    /**
     * Sinh mã hợp đồng dạng HD-2026-0001.
     */
    private String generateContractCode() {
        int year = Year.now().getValue();

        for (int i = 0; i < 100; i++) {
            int number = ThreadLocalRandom.current().nextInt(1, 10000);

            String code = String.format(
                    "HD-%d-%04d",
                    year,
                    number
            );

            if (!contractRepository.existsByContractCode(code)) {
                return code;
            }
        }

        throw new IllegalStateException("Không thể tạo mã hợp đồng");
    }
}