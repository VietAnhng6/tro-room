package com.troroom.backend.service;

import com.troroom.backend.dto.ListingDetailResponse;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.RoomService;
import com.troroom.backend.entity.Service;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.repository.RoomImageRepository;
import com.troroom.backend.repository.RoomServiceRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@org.springframework.stereotype.Service
public class ListingService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ListingRepository listingRepository;
    private final RoomImageRepository roomImageRepository;
    private final RoomServiceRepository roomServiceRepository;

    public ListingService(
            ListingRepository listingRepository,
            RoomImageRepository roomImageRepository,
            RoomServiceRepository roomServiceRepository
    ) {
        this.listingRepository = listingRepository;
        this.roomImageRepository = roomImageRepository;
        this.roomServiceRepository = roomServiceRepository;
    }

    public Listing createListing(Room room, String title, String description) {
        if (room.getStatus() != Room.Status.EMPTY) {
            throw new IllegalStateException(
                    "Chỉ có thể tạo tin cho phòng đang trống"
            );
        }

        if (listingRepository.existsByRoomAndStatus(room, Listing.Status.PUBLISHED)) {
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
