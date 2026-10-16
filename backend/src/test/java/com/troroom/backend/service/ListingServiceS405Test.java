package com.troroom.backend.service;

import com.troroom.backend.dto.VacantRoomListingResponse;
import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.Listing;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.RentalRequest;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ListingRepository;
import com.troroom.backend.repository.RoomImageRepository;
import com.troroom.backend.repository.RoomRepository;
import com.troroom.backend.repository.RoomServiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListingServiceS405Test {

    @Mock private ListingRepository listingRepository;
    @Mock private RoomImageRepository roomImageRepository;
    @Mock private RoomServiceRepository roomServiceRepository;
    @Mock private RoomRepository roomRepository;

    private ListingService listingService;
    private User landlord;
    private Building building;
    private Room room;

    private static void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
        listingService = new ListingService(
                listingRepository,
                roomImageRepository,
                roomServiceRepository,
                roomRepository
        );

        landlord = new User();
        setId(landlord, 11L);
        landlord.setName("Chủ nhà test");
        landlord.setPhone("0911111111");
        landlord.setPassword("password-hash");
        landlord.setRole(User.Role.LANDLORD);

        building = new Building();
        setId(building, 21L);
        building.setName("Tòa A");
        building.setAddress("Hà Nội");
        building.setFloors(4);
        building.setLandlord(landlord);

        room = new Room();
        setId(room, 31L);
        room.setCode("P101");
        room.setBuilding(building);
        room.setFloor(1);
        room.setArea(25);
        room.setRent(2_800_000L);
        room.setMaxPeople(2);
        room.setStatus(Room.Status.EMPTY);
    }

    @Test
    void checkoutDraftCopiesOldListingAndKeepsRoomForImagesAndCurrentPrice() {
        room.setStatus(Room.Status.RENTED);
        Listing oldListing = new Listing();
        setId(oldListing, 41L);
        oldListing.setRoom(room);
        oldListing.setTitle("Phòng P101 sáng thoáng");
        oldListing.setDescription("Gần bến xe, có cửa sổ và máy lạnh");
        oldListing.setStatus(Listing.Status.RENTED);
        oldListing.setCreatedAt(LocalDateTime.now().minusMonths(2));
        oldListing.setExpiresAt(LocalDateTime.now().plusDays(10));

        RentalRequest request = new RentalRequest();
        request.setListing(oldListing);
        RentalContract contract = new RentalContract();
        contract.setRoom(room);
        contract.setRequest(request);

        when(listingRepository.save(any(Listing.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Listing draft = listingService.createRepublishDraftFromEndedContract(contract)
                .orElseThrow();

        assertNotSame(oldListing, draft);
        assertEquals(room, draft.getRoom(), "Ảnh phòng được giữ vì tiếp tục dùng cùng room_id");
        assertEquals(oldListing.getTitle(), draft.getTitle());
        assertEquals(oldListing.getDescription(), draft.getDescription());
        assertEquals(Listing.Status.DRAFT, draft.getStatus());
        assertNotNull(draft.getCreatedAt());
        assertTrue(draft.getExpiresAt().isAfter(draft.getCreatedAt()));
        assertEquals(2_800_000L, draft.getRoom().getRent(), "Giá lấy theo giá phòng hiện tại");
        verify(listingRepository).save(any(Listing.class));
    }

    @Test
    void dashboardListsEmptyRoomsWithoutPublishedListingAndShowsDraftAndCurrentRent() {
        Listing draft = new Listing();
        setId(draft, 51L);
        draft.setRoom(room);
        draft.setTitle("Tin nháp P101");
        draft.setDescription("Mô tả được giữ lại");
        draft.setStatus(Listing.Status.DRAFT);
        draft.setCreatedAt(LocalDateTime.now());
        draft.setExpiresAt(LocalDateTime.now().plusDays(30));

        when(roomRepository.findByBuilding_Landlord(landlord)).thenReturn(List.of(room));
        when(listingRepository.existsByRoomAndStatusAndExpiresAtAfter(
                eq(room), eq(Listing.Status.PUBLISHED), any(LocalDateTime.class))).thenReturn(false);
        when(listingRepository.findFirstByRoomAndStatusOrderByCreatedAtDesc(room, Listing.Status.DRAFT))
                .thenReturn(Optional.of(draft));
        when(roomImageRepository.countByRoom(room)).thenReturn(3L);

        List<VacantRoomListingResponse> results = listingService
                .getVacantRoomsWithoutPublishedListing(landlord);

        assertEquals(1, results.size());
        VacantRoomListingResponse row = results.get(0);
        assertEquals(31L, row.roomId());
        assertEquals(2_800_000L, row.currentRent());
        assertEquals(3L, row.imageCount());
        assertEquals(51L, row.draftListingId());
        assertTrue(row.hasDraft());
    }

    @Test
    void landlordCanPublishDraftInOneOperationUsingCurrentRoomRent() {
        Listing draft = new Listing();
        setId(draft, 61L);
        draft.setRoom(room);
        draft.setTitle("Tin nháp");
        draft.setDescription("Mô tả");
        draft.setStatus(Listing.Status.DRAFT);
        draft.setCreatedAt(LocalDateTime.now().minusDays(45));
        draft.setExpiresAt(LocalDateTime.now().minusDays(15));

        when(listingRepository.findById(61L)).thenReturn(Optional.of(draft));
        when(listingRepository.existsByRoomAndStatusAndExpiresAtAfter(
                eq(room), eq(Listing.Status.PUBLISHED), any(LocalDateTime.class))).thenReturn(false);
        when(listingRepository.save(any(Listing.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Listing published = listingService.publishDraft(landlord, 61L);

        assertEquals(Listing.Status.PUBLISHED, published.getStatus());
        assertEquals(2_800_000L, published.getRoom().getRent());
        assertTrue(published.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(1)));
        assertTrue(published.getExpiresAt().isAfter(LocalDateTime.now().plusDays(29)));
    }

    @Test
    void otherLandlordCannotPublishDraft() {
        User other = new User();
        setId(other, 99L);
        other.setName("Chủ nhà khác");
        other.setPhone("0922222222");
        other.setPassword("password-hash");
        other.setRole(User.Role.LANDLORD);

        Listing draft = new Listing();
        setId(draft, 71L);
        draft.setRoom(room);
        draft.setTitle("Tin nháp");
        draft.setDescription("Mô tả");
        draft.setStatus(Listing.Status.DRAFT);
        when(listingRepository.findById(71L)).thenReturn(Optional.of(draft));

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> listingService.publishDraft(other, 71L)
        );
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(listingRepository, never()).save(any(Listing.class));
    }
}
