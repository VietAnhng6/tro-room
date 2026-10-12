package com.troroom.backend.service;

import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.Roommate;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RoomServiceRepository;
import com.troroom.backend.repository.RoommateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RentalContractViewServiceTest {

    @Mock
    private RentalContractRepository contractRepository;
    @Mock
    private RoommateRepository roommateRepository;
    @Mock
    private RoomServiceRepository roomServiceRepository;

    private RentalContractViewService service;

    @BeforeEach
    void setUp() {
        service = new RentalContractViewService(
                contractRepository,
                roommateRepository,
                roomServiceRepository
        );
    }

    @Test
    void namedTenantCanViewOwnContract() {
        User tenant = user(11L, "0901234567", User.Role.TENANT);
        Room room = room(100L);
        RentalContract contract = contract(7L, room, tenant,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        when(contractRepository.findById(7L)).thenReturn(Optional.of(contract));

        assertSame(contract, service.findAccessibleContract(7L, tenant));
    }

    @Test
    void roommateCanViewContractOverlappingTheirStay() {
        User viewer = user(22L, "0902222222", User.Role.TENANT);
        Room room = room(100L);
        RentalContract contract = contract(7L, room,
                user(11L, "0901111111", User.Role.TENANT),
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        Roommate roommate = roommate(room, "0902222222",
                LocalDate.of(2026, 3, 1), LocalDate.of(2026, 5, 1), Roommate.Status.MOVED_OUT);

        when(contractRepository.findById(7L)).thenReturn(Optional.of(contract));
        when(roommateRepository.findByRoomIdAndPhoneOrderByStartDateDesc(100L, "0902222222"))
                .thenReturn(List.of(roommate));

        assertSame(contract, service.findAccessibleContract(7L, viewer));
    }

    @Test
    void roommateCannotViewContractOutsideTheirStay() {
        User viewer = user(22L, "0902222222", User.Role.TENANT);
        Room room = room(100L);
        RentalContract contract = contract(7L, room,
                user(11L, "0901111111", User.Role.TENANT),
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        Roommate roommate = roommate(room, "0902222222",
                LocalDate.of(2027, 1, 1), null, Roommate.Status.ACTIVE);

        when(contractRepository.findById(7L)).thenReturn(Optional.of(contract));
        when(roommateRepository.findByRoomIdAndPhoneOrderByStartDateDesc(100L, "0902222222"))
                .thenReturn(List.of(roommate));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.findAccessibleContract(7L, viewer)
        );
        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void nonTenantCannotViewContract() {
        User landlord = user(33L, "0902222222", User.Role.LANDLORD);
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.findAccessibleContract(7L, landlord)
        );
        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void roommateContractListDoesNotLeakAContractFromAnotherStayPeriod() {
        User viewer = user(22L, "0902222222", User.Role.TENANT);
        Room room = room(100L);
        RentalContract contract = contract(7L, room,
                user(11L, "0901111111", User.Role.TENANT),
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        Roommate roommate = roommate(room, "0902222222",
                LocalDate.of(2027, 1, 1), null, Roommate.Status.ACTIVE);

        when(contractRepository.findByTenantOrderByStartDateDesc(viewer)).thenReturn(List.of());
        when(roommateRepository.findByPhoneOrderByStartDateDesc("0902222222"))
                .thenReturn(List.of(roommate));
        when(contractRepository.findByRoomOrderByStartDateDesc(room)).thenReturn(List.of(contract));

        assertEquals(List.of(), service.getMyContracts(viewer));
    }

    private static User user(Long id, String phone, User.Role role) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getPhone()).thenReturn(phone);
        when(user.getRole()).thenReturn(role);
        return user;
    }

    private static Room room(Long id) {
        Room room = mock(Room.class);
        when(room.getId()).thenReturn(id);
        return room;
    }

    private static RentalContract contract(Long id, Room room, User tenant,
                                           LocalDate start, LocalDate end) {
        RentalContract contract = mock(RentalContract.class);
        when(contract.getId()).thenReturn(id);
        when(contract.getRoom()).thenReturn(room);
        when(contract.getTenant()).thenReturn(tenant);
        when(contract.getStartDate()).thenReturn(start);
        when(contract.getEndDate()).thenReturn(end);
        return contract;
    }

    private static Roommate roommate(Room room, String phone, LocalDate start, LocalDate end,
                                     Roommate.Status status) {
        Roommate roommate = mock(Roommate.class);
        when(roommate.getRoom()).thenReturn(room);
        when(roommate.getPhone()).thenReturn(phone);
        when(roommate.getStartDate()).thenReturn(start);
        when(roommate.getEndDate()).thenReturn(end);
        when(roommate.getStatus()).thenReturn(status);
        when(roommate.getFullName()).thenReturn("Roommate");
        when(roommate.getCitizenId()).thenReturn("001234567890");
        return roommate;
    }
}
