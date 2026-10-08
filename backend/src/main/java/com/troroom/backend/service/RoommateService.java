package com.troroom.backend.service;

import com.troroom.backend.dto.*;
import com.troroom.backend.entity.Contract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.Roommate;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ContractRepository;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.repository.RoommateRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class RoommateService {

    private final RoomRepository roomRepository;
    private final ContractRepository contractRepository;
    private final RoommateRepository roommateRepository;
    private final AuditLogService auditLogService;

    public RoommateService(
            RoomRepository roomRepository,
            ContractRepository contractRepository,
            RoommateRepository roommateRepository,
            AuditLogService auditLogService
    ) {
        this.roomRepository = roomRepository;
        this.contractRepository = contractRepository;
        this.roommateRepository = roommateRepository;
        this.auditLogService = auditLogService;
    }

    /*
     * KIỂM TRA QUYỀN TRÊN PHÒNG / TÒA NHÀ
     */
    public void validateRoomAccess(User user, Room room) {
        if (user == null || room == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng chưa xác thực");
        }

        String role = user.getRole().name();
        if ("ADMIN".equals(role)) {
            return;
        }

        if (room.getBuilding() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Phòng không thuộc tòa nhà hợp lệ");
        }

        if ("LANDLORD".equals(role)) {
            User landlord = room.getBuilding().getLandlord();
            if (landlord == null || !landlord.getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không sở hữu tòa nhà chứa phòng này");
            }
            return;
        }

        if ("MANAGER".equals(role)) {
            User manager = room.getBuilding().getManager();
            if (manager == null || !manager.getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không được giao quản lý tòa nhà chứa phòng này");
            }
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền quản lý phòng này");
    }

    /*
     * S3-02: TỔNG QUAN NGƯỜI Ở HIỆN TẠI VÀ SỨC CHỨA CỦA PHÒNG
     */
    @Transactional(readOnly = true)
    public RoomOccupantsSummaryResponse getOccupantsSummary(Long roomId, User currentUser) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng"));

        validateRoomAccess(currentUser, room);

        Optional<Contract> activeContractOpt = contractRepository.findFirstByRoomIdAndStatus(roomId, Contract.Status.ACTIVE);
        ContractResponse mainContract = activeContractOpt.map(this::mapToContractResponse).orElse(null);

        List<Roommate> activeRoommates = roommateRepository.findByRoomIdAndStatusOrderByStartDateDesc(roomId, Roommate.Status.ACTIVE);
        List<Roommate> movedOutRoommates = roommateRepository.findByRoomIdAndStatusOrderByStartDateDesc(roomId, Roommate.Status.MOVED_OUT);

        int contractOccupantCount = (mainContract != null) ? 1 : 0;
        int currentOccupants = contractOccupantCount + activeRoommates.size();
        int maxPeople = room.getMaxPeople();
        int availableSlots = Math.max(0, maxPeople - currentOccupants);
        boolean isFull = currentOccupants >= maxPeople;

        List<RoommateResponse> activeList = activeRoommates.stream().map(this::mapToRoommateResponse).toList();
        List<RoommateResponse> movedOutList = movedOutRoommates.stream().map(this::mapToRoommateResponse).toList();

        return new RoomOccupantsSummaryResponse(
                room.getId(),
                room.getCode(),
                room.getBuilding().getId(),
                room.getBuilding().getName(),
                maxPeople,
                currentOccupants,
                availableSlots,
                isFull,
                mainContract,
                activeList,
                movedOutList
        );
    }

    /*
     * S3-02: THIẾT LẬP / CẬP NHẬT NGƯỜI ĐỨNG TÊN HỢP ĐỒNG (1 NGƯỜI DUY NHẤT)
     */
    @Transactional
    public ContractResponse upsertMainContract(Long roomId, ContractRequest request, User currentUser) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng"));

        validateRoomAccess(currentUser, room);

        if (request.tenantName() == null || request.tenantName().trim().length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ tên người đứng tên hợp đồng phải từ 2 ký tự trở lên");
        }

        String phone = (request.tenantPhone() != null) ? request.tenantPhone().trim() : "";
        if (!phone.matches("^0\\d{9}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0");
        }

        String citizenId = (request.tenantCitizenId() != null) ? request.tenantCitizenId().trim() : "";
        if (!citizenId.matches("^(\\d{9}|\\d{12})$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số CCCD/CMND phải gồm 9 hoặc 12 chữ số hợp lệ");
        }

        if (request.startDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu hợp đồng không được để trống");
        }

        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày kết thúc hợp đồng không được trước ngày bắt đầu");
        }

        Optional<Contract> activeContractOpt = contractRepository.findFirstByRoomIdAndStatus(roomId, Contract.Status.ACTIVE);
        Contract contract = activeContractOpt.orElseGet(() -> {
            Contract newContract = new Contract();
            newContract.setRoom(room);
            newContract.setContractCode("HD-" + room.getCode() + "-" + System.currentTimeMillis() % 100000);
            return newContract;
        });

        contract.setTenantName(request.tenantName().trim());
        contract.setTenantPhone(phone);
        contract.setTenantCitizenId(citizenId);
        contract.setStartDate(request.startDate());
        contract.setEndDate(request.endDate());
        contract.setDepositAmount(request.depositAmount() != null ? Math.max(0, request.depositAmount()) : 0);
        contract.setRentAmount(request.rentAmount() != null ? Math.max(0, request.rentAmount()) : room.getRent());
        contract.setNote(request.note() != null ? request.note().trim() : "");
        contract.setStatus(Contract.Status.ACTIVE);
        contract.setUpdatedAt(LocalDateTime.now());

        Contract saved = contractRepository.save(contract);

        // Link existing active roommates to this contract if not linked
        List<Roommate> activeRoommates = roommateRepository.findByRoomIdAndStatusOrderByStartDateDesc(roomId, Roommate.Status.ACTIVE);
        for (Roommate r : activeRoommates) {
            if (r.getContract() == null) {
                r.setContract(saved);
                roommateRepository.save(r);
            }
        }

        // Tự động chuyển trạng thái phòng nếu còn trống
        if (room.getStatus() == Room.Status.EMPTY) {
            room.setStatus(Room.Status.RENTED);
            roomRepository.save(room);
        }

        auditLogService.log(
                currentUser,
                "UPSERT_CONTRACT_SIGNER",
                "Contract",
                saved.getId(),
                null,
                Map.of(
                        "roomId", roomId,
                        "roomCode", room.getCode(),
                        "tenantName", saved.getTenantName(),
                        "tenantPhone", saved.getTenantPhone(),
                        "depositAmount", saved.getDepositAmount()
                )
        );

        return mapToContractResponse(saved);
    }

    /*
     * S3-02: THÊM NGƯỜI Ở GHÉP VÀO PHÒNG (KIỂM TRA CHẶN VƯỢT QUÁ SỐ NGƯỜI TỐI ĐA)
     */
    @Transactional
    public RoommateResponse addRoommate(Long roomId, RoommateRequest request, User currentUser) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng"));

        validateRoomAccess(currentUser, room);

        // 1. Kiểm tra giới hạn số người tối đa của phòng
        Optional<Contract> activeContractOpt = contractRepository.findFirstByRoomIdAndStatus(roomId, Contract.Status.ACTIVE);
        int mainContractCount = activeContractOpt.isPresent() ? 1 : 0;
        long activeRoommateCount = roommateRepository.countByRoomIdAndStatus(roomId, Roommate.Status.ACTIVE);
        long currentOccupants = mainContractCount + activeRoommateCount;
        int maxPeople = room.getMaxPeople();

        if (currentOccupants + 1 > maxPeople) {
            String detailMsg = "Phòng " + room.getCode() + " có sức chứa tối đa " + maxPeople + " người. " +
                    "Hiện tại phòng đã có " + currentOccupants + " người (" +
                    (mainContractCount > 0 ? "1 người đứng tên hợp đồng" : "0 người đứng tên") +
                    " + " + activeRoommateCount + " người ở ghép đang ở). " +
                    "Không thể tiếp nhận thêm người ở ghép mới!";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, detailMsg);
        }

        // 2. Validate input fields
        if (request.fullName() == null || request.fullName().trim().length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ và tên người ở ghép phải từ 2 ký tự trở lên");
        }

        String phone = (request.phone() != null) ? request.phone().trim() : "";
        if (!phone.matches("^0\\d{9}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0");
        }

        String citizenId = (request.citizenId() != null) ? request.citizenId().trim() : "";
        if (!citizenId.matches("^(\\d{9}|\\d{12})$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số CCCD/CMND phải gồm 9 hoặc 12 chữ số hợp lệ");
        }

        if (request.startDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu ở cùng không được để trống");
        }

        // 3. Tạo bản ghi Roommate
        Roommate roommate = new Roommate();
        roommate.setRoom(room);
        roommate.setContract(activeContractOpt.orElse(null));
        roommate.setFullName(request.fullName().trim());
        roommate.setPhone(phone);
        roommate.setCitizenId(citizenId);
        roommate.setStartDate(request.startDate());
        roommate.setStatus(Roommate.Status.ACTIVE);
        roommate.setNote(request.note() != null ? request.note().trim() : "");
        roommate.setCreatedAt(LocalDateTime.now());
        roommate.setUpdatedAt(LocalDateTime.now());

        Roommate saved = roommateRepository.save(roommate);

        auditLogService.log(
                currentUser,
                "ADD_ROOMMATE",
                "Roommate",
                saved.getId(),
                null,
                Map.of(
                        "roomId", roomId,
                        "roomCode", room.getCode(),
                        "fullName", saved.getFullName(),
                        "phone", saved.getPhone(),
                        "citizenId", saved.getCitizenId(),
                        "startDate", saved.getStartDate().toString()
                )
        );

        return mapToRoommateResponse(saved);
    }

    /*
     * S3-02: CẬP NHẬT THÔNG TIN NGƯỜI Ở GHÉP
     */
    @Transactional
    public RoommateResponse updateRoommate(Long roomId, Long roommateId, RoommateRequest request, User currentUser) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng"));

        validateRoomAccess(currentUser, room);

        Roommate roommate = roommateRepository.findById(roommateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin người ở ghép"));

        if (!roommate.getRoom().getId().equals(roomId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người ở ghép không thuộc phòng này");
        }

        if (request.fullName() == null || request.fullName().trim().length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ và tên người ở ghép phải từ 2 ký tự trở lên");
        }

        String phone = (request.phone() != null) ? request.phone().trim() : "";
        if (!phone.matches("^0\\d{9}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0");
        }

        String citizenId = (request.citizenId() != null) ? request.citizenId().trim() : "";
        if (!citizenId.matches("^(\\d{9}|\\d{12})$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số CCCD/CMND phải gồm 9 hoặc 12 chữ số hợp lệ");
        }

        if (request.startDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu ở cùng không được để trống");
        }

        roommate.setFullName(request.fullName().trim());
        roommate.setPhone(phone);
        roommate.setCitizenId(citizenId);
        roommate.setStartDate(request.startDate());
        if (request.note() != null) {
            roommate.setNote(request.note().trim());
        }
        roommate.setUpdatedAt(LocalDateTime.now());

        Roommate saved = roommateRepository.save(roommate);

        auditLogService.log(
                currentUser,
                "UPDATE_ROOMMATE",
                "Roommate",
                saved.getId(),
                null,
                Map.of(
                        "roomId", roomId,
                        "fullName", saved.getFullName(),
                        "phone", saved.getPhone()
                )
        );

        return mapToRoommateResponse(saved);
    }

    /*
     * S3-02: GHI NHẬN NGÀY CHUYỂN ĐI CỦA NGƯỜI Ở GHÉP (GIẢM SỐ NGƯỜI ĐANG Ở)
     */
    @Transactional
    public RoommateResponse recordMoveOut(Long roomId, Long roommateId, MoveOutRequest request, User currentUser) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng"));

        validateRoomAccess(currentUser, room);

        Roommate roommate = roommateRepository.findById(roommateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin người ở ghép"));

        if (!roommate.getRoom().getId().equals(roomId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người ở ghép không thuộc phòng này");
        }

        LocalDate moveOutDate = (request != null && request.moveOutDate() != null) ? request.moveOutDate() : LocalDate.now();

        if (moveOutDate.isBefore(roommate.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày chuyển đi (" + moveOutDate + ") không thể trước ngày bắt đầu ở cùng (" + roommate.getStartDate() + ")");
        }

        roommate.setEndDate(moveOutDate);
        roommate.setStatus(Roommate.Status.MOVED_OUT);
        if (request != null && request.note() != null && !request.note().isBlank()) {
            String updatedNote = (roommate.getNote() == null || roommate.getNote().isBlank())
                    ? request.note().trim()
                    : roommate.getNote() + " | " + request.note().trim();
            roommate.setNote(updatedNote);
        }
        roommate.setUpdatedAt(LocalDateTime.now());

        Roommate saved = roommateRepository.save(roommate);

        auditLogService.log(
                currentUser,
                "ROOMMATE_MOVE_OUT",
                "Roommate",
                saved.getId(),
                null,
                Map.of(
                        "roomId", roomId,
                        "roomCode", room.getCode(),
                        "fullName", saved.getFullName(),
                        "moveOutDate", moveOutDate.toString(),
                        "status", saved.getStatus().name()
                )
        );

        return mapToRoommateResponse(saved);
    }

    /*
     * S3-02: XÓA NGƯỜI Ở GHÉP (NẾU NHẬP NHẦM)
     */
    @Transactional
    public void deleteRoommate(Long roomId, Long roommateId, User currentUser) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng"));

        validateRoomAccess(currentUser, room);

        Roommate roommate = roommateRepository.findById(roommateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin người ở ghép"));

        if (!roommate.getRoom().getId().equals(roomId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người ở ghép không thuộc phòng này");
        }

        roommateRepository.delete(roommate);

        auditLogService.log(
                currentUser,
                "DELETE_ROOMMATE",
                "Roommate",
                roommateId,
                Map.of(
                        "fullName", roommate.getFullName(),
                        "roomId", roomId
                ),
                null
        );
    }

    /*
     * S3-02: LỊCH SỬ NGƯỜI Ở CỦA PHÒNG THEO KHOẢNG THỜI GIAN VÀ TRẠNG THÁI
     */
    @Transactional(readOnly = true)
    public List<OccupantHistoryItemResponse> getOccupantsHistory(
            Long roomId,
            LocalDate fromDate,
            LocalDate toDate,
            String statusFilter,
            String keyword,
            User currentUser
    ) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng"));

        validateRoomAccess(currentUser, room);

        List<OccupantHistoryItemResponse> result = new ArrayList<>();
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim().toLowerCase() : null;

        // 1. Load contracts history
        List<Contract> contracts = contractRepository.findByRoomIdOrderByStartDateDesc(roomId);
        for (Contract c : contracts) {
            // Date range overlap check
            if (fromDate != null && c.getEndDate() != null && c.getEndDate().isBefore(fromDate)) {
                continue;
            }
            if (toDate != null && c.getStartDate() != null && c.getStartDate().isAfter(toDate)) {
                continue;
            }

            boolean matchesStatus = true;
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                if ("ACTIVE".equalsIgnoreCase(statusFilter) && c.getStatus() != Contract.Status.ACTIVE) {
                    matchesStatus = false;
                } else if ("MOVED_OUT".equalsIgnoreCase(statusFilter) && c.getStatus() == Contract.Status.ACTIVE) {
                    matchesStatus = false;
                }
            }

            boolean matchesKw = true;
            if (kw != null) {
                matchesKw = (c.getTenantName() != null && c.getTenantName().toLowerCase().contains(kw)) ||
                        (c.getTenantPhone() != null && c.getTenantPhone().contains(kw)) ||
                        (c.getTenantCitizenId() != null && c.getTenantCitizenId().contains(kw));
            }

            if (matchesStatus && matchesKw) {
                LocalDate end = (c.getEndDate() != null) ? c.getEndDate() : (c.getStatus() == Contract.Status.ACTIVE ? LocalDate.now() : c.getStartDate());
                long days = Math.max(1, ChronoUnit.DAYS.between(c.getStartDate(), end));

                String statusLabel = switch (c.getStatus()) {
                    case ACTIVE -> "Đang ở (Người đứng tên)";
                    case EXPIRED -> "Hết hạn hợp đồng";
                    case TERMINATED -> "Đã thanh lý hợp đồng";
                };

                result.add(new OccupantHistoryItemResponse(
                        c.getId(),
                        "MAIN_TENANT",
                        "Người đứng tên hợp đồng",
                        c.getTenantName(),
                        c.getTenantPhone(),
                        c.getTenantCitizenId(),
                        c.getStartDate(),
                        c.getEndDate(),
                        c.getStatus().name(),
                        statusLabel,
                        c.getNote(),
                        days
                ));
            }
        }

        // 2. Load Roommates history
        Roommate.Status rStatus = null;
        if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
            try {
                rStatus = Roommate.Status.valueOf(statusFilter.toUpperCase());
            } catch (Exception ignored) {}
        }

        List<Roommate> roommates = roommateRepository.findByRoomIdOrderByStartDateDesc(roomId);
        for (Roommate r : roommates) {
            // Status check
            if (rStatus != null && r.getStatus() != rStatus) {
                continue;
            }

            // Date range overlap check
            if (fromDate != null && r.getEndDate() != null && r.getEndDate().isBefore(fromDate)) {
                continue;
            }
            if (toDate != null && r.getStartDate() != null && r.getStartDate().isAfter(toDate)) {
                continue;
            }

            boolean matchesKw = true;
            if (kw != null) {
                matchesKw = (r.getFullName() != null && r.getFullName().toLowerCase().contains(kw)) ||
                        (r.getPhone() != null && r.getPhone().contains(kw)) ||
                        (r.getCitizenId() != null && r.getCitizenId().contains(kw));
            }

            if (matchesKw) {
                LocalDate end = (r.getEndDate() != null) ? r.getEndDate() : (r.getStatus() == Roommate.Status.ACTIVE ? LocalDate.now() : r.getStartDate());
                long days = Math.max(1, ChronoUnit.DAYS.between(r.getStartDate(), end));

                String statusLabel = (r.getStatus() == Roommate.Status.ACTIVE) ? "Đang ở (Ở ghép)" : "Đã chuyển đi";

                result.add(new OccupantHistoryItemResponse(
                        r.getId(),
                        "ROOMMATE",
                        "Người ở ghép",
                        r.getFullName(),
                        r.getPhone(),
                        r.getCitizenId(),
                        r.getStartDate(),
                        r.getEndDate(),
                        r.getStatus().name(),
                        statusLabel,
                        r.getNote(),
                        days
                ));
            }
        }

        // Sort combined list by startDate DESC
        result.sort((a, b) -> {
            if (a.startDate() == null && b.startDate() == null) return 0;
            if (a.startDate() == null) return 1;
            if (b.startDate() == null) return -1;
            return b.startDate().compareTo(a.startDate());
        });

        return result;
    }

    private ContractResponse mapToContractResponse(Contract c) {
        return new ContractResponse(
                c.getId(),
                c.getContractCode(),
                c.getRoom().getId(),
                c.getRoom().getCode(),
                c.getTenantName(),
                c.getTenantPhone(),
                c.getTenantCitizenId(),
                c.getStartDate(),
                c.getEndDate(),
                c.getDepositAmount(),
                c.getRentAmount(),
                c.getStatus(),
                c.getNote()
        );
    }

    private RoommateResponse mapToRoommateResponse(Roommate r) {
        return new RoommateResponse(
                r.getId(),
                r.getRoom().getId(),
                r.getFullName(),
                r.getPhone(),
                r.getCitizenId(),
                r.getStartDate(),
                r.getEndDate(),
                r.getStatus(),
                r.getNote()
        );
    }
}
