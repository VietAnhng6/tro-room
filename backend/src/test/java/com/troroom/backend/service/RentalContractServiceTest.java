package com.troroom.backend.service;

import com.troroom.backend.entity.ContractRenewal;
import com.troroom.backend.entity.RentalContract;
import com.troroom.backend.entity.Room;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.ContractRenewalRepository;
import com.troroom.backend.repository.RentalContractRepository;
import com.troroom.backend.repository.RentalRequestRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RentalContractServiceTest {

    @Mock
    private RentalContractRepository contractRepository;

    @Mock
    private RentalRequestRepository requestRepository;

    @Mock
    private ContractRenewalRepository renewalRepository;

    @Mock
    private User landlord;

    @Mock
    private RentalContract contract;

    @Mock
    private Room room;

    private RentalContractService service;

    @BeforeEach
    void setUp() {
        service = new RentalContractService(
                contractRepository,
                requestRepository,
                renewalRepository
        );
    }

    @Test
    void renewContract_shouldContinueFromLatestRenewal() {
        when(landlord.getId()).thenReturn(13L);
        when(landlord.getRole()).thenReturn(User.Role.LANDLORD);

        when(contractRepository.findById(1L))
                .thenReturn(Optional.of(contract));

        when(contract.getId()).thenReturn(1L);
        when(contract.getRent()).thenReturn(2_500_000L);
        when(contract.getEndDate())
                .thenReturn(LocalDate.of(2028, 10, 8));
        when(contract.getTermMonths()).thenReturn(12);
        when(contract.getRoom()).thenReturn(room);

        when(room.getBuilding()).thenReturn(
                mock(com.troroom.backend.entity.Building.class)
        );
        when(room.getBuilding().getLandlord()).thenReturn(landlord);

        ContractRenewal previous = mock(ContractRenewal.class);
        when(previous.getRent()).thenReturn(3_000_000L);

        when(renewalRepository.findByContract_IdOrderByStartDateAsc(1L))
                .thenReturn(List.of(previous));

        when(contractRepository.existsOverlappingContractExcludingCurrent(
                eq(room),
                eq(1L),
                any(LocalDate.class),
                any(LocalDate.class)
        )).thenReturn(false);

        when(renewalRepository.save(any(ContractRenewal.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ContractRenewal result =
                service.renewContract(landlord, 1L, 12, null);

        assertEquals(LocalDate.of(2028, 10, 9), result.getStartDate());
        assertEquals(LocalDate.of(2029, 10, 8), result.getEndDate());
        assertEquals(3_000_000L, result.getRent());
        assertEquals(12, result.getTermMonths());

        verify(contract).setEndDate(LocalDate.of(2029, 10, 8));
        verify(contract).setTermMonths(24);
        verify(contract, never()).setRent(anyLong());
        verify(contractRepository).save(contract);
        verify(renewalRepository).save(any(ContractRenewal.class));
    }

    @Test
    void renewContract_withInvalidTerm_shouldReturnBadRequest() {
        when(landlord.getRole()).thenReturn(User.Role.LANDLORD);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.renewContract(landlord, 1L, 0, null)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(contractRepository, never()).findById(anyLong());
        verify(renewalRepository, never()).save(any(ContractRenewal.class));
    }
}
