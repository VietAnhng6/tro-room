package com.troroom.backend.controller;

import com.troroom.backend.dto.*;
import com.troroom.backend.entity.User;
import com.troroom.backend.service.RoommateService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms/{roomId}")
public class RoommateController {

    private final RoommateService roommateService;

    public RoommateController(RoommateService roommateService) {
        this.roommateService = roommateService;
    }

    /*
     * 1. Lấy thông tin tổng quan người ở hiện tại và giới hạn sức chứa của phòng
     */
    @GetMapping("/occupants")
    public ResponseEntity<RoomOccupantsSummaryResponse> getOccupants(
            @PathVariable Long roomId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(roommateService.getOccupantsSummary(roomId, currentUser));
    }

    /*
     * 2. Thiết lập / Cập nhật người đứng tên hợp đồng (1 người duy nhất)
     */
    @PostMapping("/contract")
    public ResponseEntity<ContractResponse> upsertContract(
            @PathVariable Long roomId,
            @RequestBody ContractRequest request,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(roommateService.upsertMainContract(roomId, request, currentUser));
    }

    /*
     * 3. Thêm người ở ghép vào phòng (Kiểm tra giới hạn maxPeople)
     */
    @PostMapping("/roommates")
    public ResponseEntity<RoommateResponse> addRoommate(
            @PathVariable Long roomId,
            @RequestBody RoommateRequest request,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(roommateService.addRoommate(roomId, request, currentUser));
    }

    /*
     * 4. Cập nhật thông tin người ở ghép
     */
    @PutMapping("/roommates/{roommateId}")
    public ResponseEntity<RoommateResponse> updateRoommate(
            @PathVariable Long roomId,
            @PathVariable Long roommateId,
            @RequestBody RoommateRequest request,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(roommateService.updateRoommate(roomId, roommateId, request, currentUser));
    }

    /*
     * 5. Ghi nhận ngày chuyển đi của người ở ghép
     */
    @PutMapping("/roommates/{roommateId}/move-out")
    public ResponseEntity<RoommateResponse> recordMoveOut(
            @PathVariable Long roomId,
            @PathVariable Long roommateId,
            @RequestBody(required = false) MoveOutRequest request,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(roommateService.recordMoveOut(roomId, roommateId, request, currentUser));
    }

    /*
     * 6. Xóa người ở ghép (khi nhập nhầm)
     */
    @DeleteMapping("/roommates/{roommateId}")
    public ResponseEntity<?> deleteRoommate(
            @PathVariable Long roomId,
            @PathVariable Long roommateId,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        roommateService.deleteRoommate(roomId, roommateId, currentUser);
        return ResponseEntity.ok(Map.of("message", "Đã xóa thông tin người ở ghép"));
    }

    /*
     * 7. Lịch sử người ở của phòng theo khoảng thời gian và trạng thái
     */
    @GetMapping("/occupants/history")
    public ResponseEntity<List<OccupantHistoryItemResponse>> getOccupantsHistory(
            @PathVariable Long roomId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            Authentication authentication
    ) {
        User currentUser = (User) authentication.getPrincipal();
        return ResponseEntity.ok(roommateService.getOccupantsHistory(roomId, from, to, status, keyword, currentUser));
    }
}
