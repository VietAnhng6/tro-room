package com.troroom.backend.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/** S4-04: kiểm thử quy tắc tính tiền khi trả phòng và tất toán. */
class CheckoutCalculatorTest {

    @Test
    void proRateRentRoundsHalfUp() {
        // 3.000.000 đồng/tháng, ở 15 ngày trên tháng 30 ngày.
        long amount = CheckoutCalculator.proRateRent(3_000_000L, 15, 30);
        assertEquals(1_500_000L, amount);
    }

    @Test
    void proRateRentRoundsToNearestDong() {
        // 1.000.000 / 30 * 10 = 333.333,(3) -> làm tròn 333.333.
        long amount = CheckoutCalculator.proRateRent(1_000_000L, 10, 30);
        assertEquals(333_333L, amount);
    }

    @Test
    void finalPeriodDaysCountsFromMonthStartWhenStartedEarlier() {
        // Khách đã ở từ tháng trước, trả phòng ngày 18 -> 18 ngày.
        int days = CheckoutCalculator.finalPeriodDays(
                LocalDate.of(2026, 10, 18),
                LocalDate.of(2026, 6, 1));
        assertEquals(18, days);
    }

    @Test
    void finalPeriodDaysCountsFromContractStartInSameMonth() {
        // Khách vào ở ngày 10 và trả phòng ngày 20 cùng tháng -> 11 ngày.
        int days = CheckoutCalculator.finalPeriodDays(
                LocalDate.of(2026, 10, 20),
                LocalDate.of(2026, 10, 10));
        assertEquals(11, days);
    }

    @Test
    void netRefundPositiveWhenDepositExceedsCharges() {
        long net = CheckoutCalculator.netRefund(
                3_000_000L,   // cọc
                500_000L,     // khấu trừ
                0L,           // nợ cũ
                1_000_000L    // hoá đơn cuối
        );
        assertEquals(1_500_000L, net);
    }

    @Test
    void netRefundNegativeMeansTenantOwesMore() {
        long net = CheckoutCalculator.netRefund(
                2_000_000L,   // cọc
                1_000_000L,   // khấu trừ
                1_500_000L,   // nợ cũ
                1_000_000L    // hoá đơn cuối
        );
        assertEquals(-1_500_000L, net);
    }

    @Test
    void sumDeductionsAddsPositiveAmounts() {
        assertEquals(800_000L, CheckoutCalculator.sumDeductions(500_000L, 300_000L));
    }

    @Test
    void sumDeductionsRejectsNegativeAmounts() {
        assertThrows(IllegalArgumentException.class,
                () -> CheckoutCalculator.sumDeductions(500_000L, -100_000L));
    }

    @Test
    void readingCannotBeBelowLastChock() {
        assertTrue(CheckoutCalculator.isReadingValid(120, 100));
        assertTrue(CheckoutCalculator.isReadingValid(100, 100));
        assertFalse(CheckoutCalculator.isReadingValid(99, 100));
    }
}
