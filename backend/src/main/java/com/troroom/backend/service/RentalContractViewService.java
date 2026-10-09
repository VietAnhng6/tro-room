package com.troroom.backend.service;

import com.troroom.backend.dto.RentalContractDetailResponse;
import com.troroom.backend.dto.RentalContractListItemResponse;
import com.troroom.backend.dto.RentalContractPersonResponse;
import com.troroom.backend.dto.RentalContractServiceItemResponse;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.RoomService;
import com.troroom.backend.entity.Roommate;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RoomServiceRepository;
import com.troroom.backend.repository.RoommateRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RentalContractViewService {

    private final RentalContractRepository contractRepository;
    private final RoommateRepository roommateRepository;
    private final RoomServiceRepository roomServiceRepository;

    public RentalContractViewService(
            RentalContractRepository contractRepository,
            RoommateRepository roommateRepository,
            RoomServiceRepository roomServiceRepository
    ) {
        this.contractRepository = contractRepository;
        this.roommateRepository = roommateRepository;
        this.roomServiceRepository = roomServiceRepository;
    }

    @Transactional(readOnly = true)
    public List<RentalContractListItemResponse> getMyContracts(User currentUser) {
        validateTenant(currentUser);

        Map<Long, RentalContract> visible = new LinkedHashMap<>();

        for (RentalContract contract : contractRepository.findByTenantOrderByStartDateDesc(currentUser)) {
            visible.put(contract.getId(), contract);
        }

        if (currentUser.getPhone() != null && !currentUser.getPhone().isBlank()) {
            List<Roommate> roommateLinks = roommateRepository.findByPhoneAndStatus(
                    currentUser.getPhone().trim(),
                    Roommate.Status.ACTIVE
            );
            for (Roommate roommate : roommateLinks) {
                if (roommate.getRoom() == null) {
                    continue;
                }
                for (RentalContract contract : contractRepository.findByRoomOrderByStartDateDesc(roommate.getRoom())) {
                    visible.put(contract.getId(), contract);
                }
            }
        }

        return visible.values().stream()
                .sorted((a, b) -> b.getStartDate().compareTo(a.getStartDate()))
                .map(this::toListItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public RentalContractDetailResponse getMyContract(Long contractId, User currentUser) {
        validateTenant(currentUser);
        return toDetail(findAccessibleContract(contractId, currentUser));
    }

    @Transactional(readOnly = true)
    public RentalContract findAccessibleContract(Long contractId, User currentUser) {
        validateTenant(currentUser);

        RentalContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hợp đồng"
                ));

        if (contract.getTenant() != null
                && currentUser.getId() != null
                && currentUser.getId().equals(contract.getTenant().getId())) {
            return contract;
        }

        String phone = currentUser.getPhone();
        if (phone != null && !phone.isBlank()
                && roommateRepository.existsByRoomIdAndPhoneAndStatus(
                contract.getRoom().getId(),
                phone.trim(),
                Roommate.Status.ACTIVE
        )) {
            return contract;
        }

        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Bạn không có quyền xem hợp đồng này"
        );
    }

    private void validateTenant(User currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng chưa xác thực");
        }
        if (currentUser.getRole() != User.Role.TENANT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chức năng này chỉ dành cho khách thuê");
        }
    }

    private RentalContractListItemResponse toListItem(RentalContract contract) {
        ContractTiming timing = timing(contract);
        Room room = contract.getRoom();
        String buildingName = room != null && room.getBuilding() != null
                ? room.getBuilding().getName()
                : "";

        return new RentalContractListItemResponse(
                contract.getId(),
                contract.getContractCode(),
                room != null ? room.getCode() : "",
                buildingName,
                contract.getRent(),
                contract.getDeposit(),
                contract.getStartDate(),
                contract.getEndDate(),
                timing.daysRemaining(),
                timing.expiringSoon(),
                timing.status()
        );
    }

    private RentalContractDetailResponse toDetail(RentalContract contract) {
        Room room = contract.getRoom();
        ContractTiming timing = timing(contract);

        List<RentalContractPersonResponse> people = new ArrayList<>();
        if (contract.getTenant() != null) {
            people.add(new RentalContractPersonResponse(
                    "NGƯỜI ĐỨNG TÊN",
                    contract.getTenant().getName(),
                    contract.getTenant().getPhone(),
                    null,
                    contract.getStartDate(),
                    contract.getEndDate()
            ));
        }

        if (room != null) {
            roommateRepository.findByRoomIdOrderByStartDateDesc(room.getId())
                    .stream()
                    .filter(r -> r.getStatus() == Roommate.Status.ACTIVE)
                    .forEach(r -> people.add(new RentalContractPersonResponse(
                            "NGƯỜI Ở GHÉP",
                            r.getFullName(),
                            r.getPhone(),
                            r.getCitizenId(),
                            r.getStartDate(),
                            r.getEndDate()
                    )));
        }

        List<RentalContractServiceItemResponse> services = room == null
                ? List.of()
                : roomServiceRepository.findByRoom(room).stream()
                .map(this::toServiceItem)
                .toList();

        return new RentalContractDetailResponse(
                contract.getId(),
                contract.getContractCode(),
                room != null ? room.getCode() : "",
                room != null ? room.getArea() : 0,
                room != null ? room.getMaxPeople() : 0,
                room != null && room.getBuilding() != null ? room.getBuilding().getName() : "",
                room != null && room.getBuilding() != null ? room.getBuilding().getAddress() : "",
                contract.getTenant() != null ? contract.getTenant().getName() : "",
                contract.getRent(),
                contract.getDeposit(),
                contract.getStartDate(),
                contract.getEndDate(),
                contract.getTermMonths(),
                contract.getBillingCutoffDay(),
                contract.getInitialElectricity(),
                contract.getInitialWater(),
                timing.daysRemaining(),
                timing.expiringSoon(),
                timing.status(),
                contract.getCreatedAt(),
                people,
                services
        );
    }

    private RentalContractServiceItemResponse toServiceItem(RoomService roomService) {
        return new RentalContractServiceItemResponse(
                roomService.getId(),
                roomService.getService().getName(),
                roomService.getService().getCalculationMethod().name(),
                roomService.getService().getUnit(),
                roomService.getPrice(),
                roomService.getService().isActive()
        );
    }

    private ContractTiming timing(RentalContract contract) {
        LocalDate today = LocalDate.now();
        LocalDate start = contract.getStartDate();
        LocalDate end = contract.getEndDate();

        if (start != null && today.isBefore(start)) {
            return new ContractTiming(ChronoUnit.DAYS.between(today, end), false, "NOT_STARTED");
        }
        if (end != null && today.isAfter(end)) {
            return new ContractTiming(ChronoUnit.DAYS.between(today, end), false, "EXPIRED");
        }

        long daysRemaining = end == null ? 0 : ChronoUnit.DAYS.between(today, end);
        return new ContractTiming(daysRemaining, daysRemaining >= 0 && daysRemaining < 30, "ACTIVE");
    }

    private record ContractTiming(long daysRemaining, boolean expiringSoon, String status) {
    }
}
