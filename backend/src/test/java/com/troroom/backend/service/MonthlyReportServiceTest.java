package com.troroom.backend.service;

import com.troroom.backend.entity.Building;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.BuildingRepository;
import com.troroom.backend.repository.InvoiceRepository;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MonthlyReportServiceTest {

    private final BuildingRepository buildingRepository =
            mock(BuildingRepository.class);
    private final InvoiceRepository invoiceRepository =
            mock(InvoiceRepository.class);
    private final RentalContractRepository contractRepository =
            mock(RentalContractRepository.class);
    private final RoomRepository roomRepository = mock(RoomRepository.class);

    private final MonthlyReportService service = new MonthlyReportService(
            buildingRepository,
            invoiceRepository,
            contractRepository,
            roomRepository);

    private User landlord;
    private Building building;

    @BeforeEach
    void setUp() {
        landlord = new User();
        ReflectionTestUtils.setField(landlord, "id", 1L);
        landlord.setRole(User.Role.LANDLORD);

        building = new Building();
        ReflectionTestUtils.setField(building, "id", 10L);
        building.setName("Tòa A");
        building.setLandlord(landlord);
        when(buildingRepository.findByLandlordOrderByIdAsc(landlord))
                .thenReturn(List.of(building));
    }

    @Test
    void summarizesInvoicesAndOccupancyForEveryMonthInRange() {
        Room rentedRoom = new Room();
        ReflectionTestUtils.setField(rentedRoom, "id", 100L);
        rentedRoom.setBuilding(building);

        RentalContract contract = new RentalContract();
        contract.setRoom(rentedRoom);
        contract.setStartDate(LocalDate.of(2026, 1, 1));
        contract.setEndDate(LocalDate.of(2026, 12, 31));

        when(invoiceRepository.aggregateForMonthlyReport(
                List.of(10L),
                "2026-08",
                "2026-09",
                List.of(
                        com.troroom.backend.entity.Invoice.Status.ISSUED,
                        com.troroom.backend.entity.Invoice.Status.PARTIALLY_PAID,
                        com.troroom.backend.entity.Invoice.Status.PAID)))
                .thenReturn(List.<Object[]>of(
                        new Object[] {"2026-08", 1_000L, 500L, 500L}));
        when(contractRepository.findForMonthlyOccupancy(
                List.of(10L),
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 9, 30)))
                .thenReturn(List.of(contract));
        when(roomRepository.countByBuildingIds(List.of(10L)))
                .thenReturn(List.<Object[]>of(new Object[] {10L, 2L}));

        var response = service.getMonthlyReport(
                landlord, null, "2026-08", "2026-09");

        assertEquals(1_000L, response.months().get(0).issuedAmount());
        assertEquals(500L, response.months().get(0).collectedAmount());
        assertEquals(500L, response.months().get(0).outstandingAmount());
        assertEquals(50.0, response.months().get(0).collectionRatePercent());
        assertEquals(1L, response.months().get(0).occupiedRooms());
        assertEquals(2L, response.months().get(0).totalRooms());
        assertEquals(50.0, response.months().get(0).occupancyRatePercent());
        assertEquals(0L, response.months().get(1).issuedAmount());
        assertEquals(1L, response.months().get(1).occupiedRooms());
    }

    @Test
    void rejectsRangesLongerThanTwelveMonths() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.getMonthlyReport(
                        landlord, null, "2025-01", "2026-01"));

        assertEquals(400, exception.getStatusCode().value());
    }

    @Test
    void occupancyUsesActualEarlyTerminationDate() {
        Room rentedRoom = new Room();
        ReflectionTestUtils.setField(rentedRoom, "id", 100L);
        rentedRoom.setBuilding(building);

        RentalContract contract = new RentalContract();
        contract.setRoom(rentedRoom);
        contract.setStartDate(LocalDate.of(2026, 1, 1));
        contract.setEndDate(LocalDate.of(2026, 12, 31));
        contract.setTerminatedAt(LocalDate.of(2026, 9, 20));

        when(invoiceRepository.aggregateForMonthlyReport(
                org.mockito.ArgumentMatchers.anyList(),
                org.mockito.ArgumentMatchers.eq("2026-08"),
                org.mockito.ArgumentMatchers.eq("2026-09"),
                org.mockito.ArgumentMatchers.anyList()))
                .thenReturn(List.of());
        when(contractRepository.findForMonthlyOccupancy(
                org.mockito.ArgumentMatchers.anyList(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()))
                .thenReturn(List.of(contract));
        when(roomRepository.countByBuildingIds(
                org.mockito.ArgumentMatchers.anyList()))
                .thenReturn(List.<Object[]>of(new Object[] {10L, 1L}));

        var response = service.getMonthlyReport(
                landlord, null, "2026-08", "2026-09");

        assertEquals(1L, response.months().get(0).occupiedRooms());
        assertEquals(0L, response.months().get(1).occupiedRooms());
    }

    @Test
    void rejectsBuildingOutsideCurrentUsersScope() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.getMonthlyReport(
                        landlord, 99L, "2026-01", "2026-01"));

        assertEquals(403, exception.getStatusCode().value());
    }
}
