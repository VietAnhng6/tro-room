package com.troroom.backend.service;

import com.troroom.backend.dto.ListingDetailResponse;
import com.troroom.backend.dto.VacantRoomListingResponse;
import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.entity.RoomService;
import com.troroom.backend.entity.Service;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.repository.RoomImageRepository;
import com.troroom.backend.repository.RoomServiceRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@org.springframework.stereotype.Service
public class ListingService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ListingRepository listingRepository;
    private final RoomImageRepository roomImageRepository;
    private final RoomServiceRepository roomServiceRepository;
    private final RoomRepository roomRepository;

    public ListingService(
            ListingRepository listingRepository,
            RoomImageRepository roomImageRepository,
            RoomServiceRepository roomServiceRepository,
            RoomRepository roomRepository
    ) {
        this.listingRepository = listingRepository;
        this.roomImageRepository = roomImageRepository;
        this.roomServiceRepository = roomServiceRepository;
        this.roomRepository = roomRepository;
    }

    /**
     * S4-05: kết thúc hợp đồng sẽ nhân bản tin gắn với yêu cầu thuê đã tạo
     * hợp đồng thành tin nháp mới. Ảnh thuộc Room (room_id), vì vậy giữ nguyên
     * Room sẽ giữ nguyên bộ ảnh; giá hiển thị luôn lấy từ Room.rent hiện tại.
     * Phương thức được gọi bên trong transaction tất toán.
     */
    @org.springframework.transaction.annotation.Transactional
    public Optional<Listing> createRepublishDraftFromEndedContract(RentalContract contract) {
        if (contract == null || contract.getRoom() == null) {
            return Optional.empty();
        }

        Room room = contract.getRoom();
        Listing source = null;
        if (contract.getRequest() != null) {
            source = contract.getRequest().getListing();
        }
        if (source == null || source.getRoom() == null
                || !source.getRoom().getId().equals(room.getId())) {
            source = listingRepository
                    .findFirstByRoomAndStatusOrderByCreatedAtDesc(room, Listing.Status.RENTED)
                    .orElse(null);
        }
        if (source == null) {
            // Phòng chưa từng có tin cũ: vẫn cho phép trả phòng; dashboard S4-05
            // sẽ liệt kê phòng để chủ nhà tự tạo tin lần đầu.
            return Optional.empty();
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        Listing draft = new Listing();
        draft.setRoom(room);
        draft.setTitle(source.getTitle());
        draft.setDescription(source.getDescription());
        draft.setStatus(Listing.Status.DRAFT);
        draft.setCreatedAt(now);
        // Listing yêu cầu expiresAt NOT NULL; thời hạn được làm mới lần nữa khi publish.
        draft.setExpiresAt(now.plusDays(30));
        return Optional.of(listingRepository.save(draft));
    }

    /** Danh sách các phòng trống của chủ nhà chưa có tin PUBLISHED. */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<VacantRoomListingResponse> getVacantRoomsWithoutPublishedListing(User landlord) {
        requireLandlord(landlord);
        return roomRepository.findByBuilding_Landlord(landlord).stream()
                .filter(room -> room.getStatus() == Room.Status.EMPTY)
                .filter(room -> !listingRepository.existsByRoomAndStatusAndExpiresAtAfter(
                        room, Listing.Status.PUBLISHED, LocalDateTime.now(VIETNAM_ZONE)))
                .map(room -> {
                    Listing draft = listingRepository
                            .findFirstByRoomAndStatusOrderByCreatedAtDesc(room, Listing.Status.DRAFT)
                            .orElse(null);
                    return new VacantRoomListingResponse(
                            room.getId(),
                            room.getCode(),
                            room.getBuilding() == null ? null : room.getBuilding().getId(),
                            room.getBuilding() == null ? "" : room.getBuilding().getName(),
                            room.getFloor(),
                            room.getArea(),
                            room.getRent(),
                            room.getMaxPeople(),
                            roomImageRepository.countByRoom(room),
                            draft == null ? null : draft.getId(),
                            draft == null ? null : draft.getTitle(),
                            draft == null ? null : draft.getDescription(),
                            draft != null
                    );
                })
                .toList();
    }

    /** Đăng một tin nháp thành PUBLISHED bằng một thao tác của đúng chủ nhà. */
    @org.springframework.transaction.annotation.Transactional
    public Listing publishDraft(User landlord, Long listingId) {
        requireLandlord(landlord);
        Listing listing = getListing(listingId);
        Room room = listing.getRoom();
        Building building = room == null ? null : room.getBuilding();

        if (building == null || building.getLandlord() == null
                || !building.getLandlord().getId().equals(landlord.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bạn không có quyền đăng tin cho phòng này");
        }
        if (listing.getStatus() != Listing.Status.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Chỉ tin ở trạng thái Nháp mới có thể đăng lại");
        }
        if (room.getStatus() != Room.Status.EMPTY) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Chỉ phòng đang trống mới có thể đăng tin");
        }
        if (listingRepository.existsByRoomAndStatusAndExpiresAtAfter(
                room, Listing.Status.PUBLISHED, LocalDateTime.now(VIETNAM_ZONE))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phòng này đã có tin đang hiển thị");
        }
        if (listing.getTitle() == null || listing.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tin nháp cần có tiêu đề trước khi đăng");
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        // Giá không được lưu lặp trong Listing: listing luôn phản ánh room.getRent().
        listing.setStatus(Listing.Status.PUBLISHED);
        listing.setCreatedAt(now);
        listing.setExpiresAt(now.plusDays(30));
        return listingRepository.save(listing);
    }

    private void requireLandlord(User user) {
        if (user == null || user.getRole() != User.Role.LANDLORD) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chỉ chủ nhà mới được quản lý tin đăng lại");
        }
    }

    public Listing createListing(Room room, String title, String description) {
        if (room.getStatus() != Room.Status.EMPTY) {
            throw new IllegalStateException(
                    "Chỉ có thể tạo tin cho phòng đang trống"
            );
        }

        if (listingRepository.existsByRoomAndStatusAndExpiresAtAfter(
                room, Listing.Status.PUBLISHED, LocalDateTime.now(VIETNAM_ZONE))) {
            throw new IllegalStateException(
                    "Phòng này đã có tin đăng đang hiển thị"
            );
        }

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tiêu đề không được để trống");
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        Listing listing = new Listing();
        listing.setRoom(room);
        listing.setTitle(title.trim());
        listing.setDescription(description == null ? "" : description.trim());
        listing.setStatus(Listing.Status.PUBLISHED);
        listing.setCreatedAt(now);
        listing.setExpiresAt(now.plusDays(30));

        return listingRepository.save(listing);
    }

    public List<Listing> getAllListings() {
        return listingRepository.findAll();
    }

    public Listing getListing(Long id) {
        return listingRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy tin đăng")
                );
    }

    public Listing updateListing(Long id, String title, String description) {
        Listing listing = getListing(id);

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Tiêu đề không được để trống");
        }

        listing.setTitle(title.trim());
        listing.setDescription(description == null ? "" : description.trim());

        return listingRepository.save(listing);
    }

    public void hideListing(Long id) {
        Listing listing = getListing(id);
        listing.setStatus(Listing.Status.HIDDEN);
        listingRepository.save(listing);
    }

    @Transactional(readOnly = true)
    public ListingDetailResponse detail(Long id) {
        Listing listing = getListing(id);
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);

        if (listing.getStatus() != Listing.Status.PUBLISHED
                || listing.getExpiresAt() == null
                || listing.getExpiresAt().isBefore(now)
                || listing.getRoom().getStatus() != Room.Status.EMPTY) {
            throw new IllegalArgumentException("Tin đăng không còn hiển thị");
        }

        Room room = listing.getRoom();
        var landlord = room.getBuilding().getLandlord();
        List<ListingDetailResponse.ImageItem> images =
                roomImageRepository.findByRoomOrderBySortOrderAsc(room)
                        .stream()
                        .map(image -> new ListingDetailResponse.ImageItem(
                                image.getId(),
                                "/api/room-images/" + image.getId(),
                                image.getSortOrder()
                        ))
                        .toList();

        List<ListingDetailResponse.ServiceItem> services =
                roomServiceRepository.findByRoom(room)
                        .stream()
                        .map(this::toServiceItem)
                        .toList();

        long fixedMonthlyCost = services.stream()
                .filter(service -> Service.CalculationMethod.FIXED_ROOM.name()
                        .equals(service.calculationMethod()))
                .mapToLong(ListingDetailResponse.ServiceItem::price)
                .sum();

        long estimatedFirstMonthCost = room.getRent() + fixedMonthlyCost;

        return new ListingDetailResponse(
                listing.getId(),
                listing.getTitle(),
                listing.getDescription(),
                listing.getStatus().name(),
                listing.getCreatedAt(),
                listing.getExpiresAt(),
                room.getId(),
                room.getCode(),
                room.getFloor(),
                room.getArea(),
                room.getRent(),
                room.getMaxPeople(),
                room.getRent(), // Quy ước tiền cọc dự kiến = 1 tháng tiền phòng.
                room.getBuilding().getName(),
                room.getBuilding().getDistrict() == null
                        ? ""
                        : room.getBuilding().getDistrict(),
                room.getBuilding().getAddress(),
                landlord.getName(),
                landlord.getPhone(),
                landlord.getEmail(),
                images,
                services,
                fixedMonthlyCost,
                estimatedFirstMonthCost
        );
    }

    private ListingDetailResponse.ServiceItem toServiceItem(RoomService roomService) {
        return new ListingDetailResponse.ServiceItem(
                roomService.getId(),
                roomService.getService().getName(),
                roomService.getService().getCalculationMethod().name(),
                roomService.getService().getUnit(),
                roomService.getPrice()
        );
    }
}
