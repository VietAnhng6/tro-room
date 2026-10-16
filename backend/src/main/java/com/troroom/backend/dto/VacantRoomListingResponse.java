package com.troroom.backend.dto;

/**
 * S4-05: phòng đang trống chưa có tin hiển thị; nếu có tin nháp thì cung cấp
 * ID để chủ nhà có thể đăng lại chỉ bằng một thao tác.
 * Giá được đọc trực tiếp từ Room.rent để luôn phản ánh giá phòng hiện tại.
 */
public record VacantRoomListingResponse(
        Long roomId,
        String roomCode,
        Long buildingId,
        String buildingName,
        int floor,
        double area,
        long currentRent,
        int maxPeople,
        long imageCount,
        Long draftListingId,
        String draftTitle,
        String draftDescription,
        boolean hasDraft
) {
}
