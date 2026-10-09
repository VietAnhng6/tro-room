package com.troroom.backend.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** S3-05: kiểm thử quy tắc chỉ số điện nước. */
class MeterReadingRulesTest {

    @Test
    void validReadingAcceptedWhenEqualOrGreaterThanPrevious() {
        assertNull(MeterReadingRules.validate("điện", 100, 100));
        assertNull(MeterReadingRules.validate("điện", 100, 150));
    }

    @Test
    void readingLowerThanPreviousIsRejected() {
        String err = MeterReadingRules.validate("điện", 100, 99);
        assertNotNull(err);
        assertTrue(err.contains("99") && err.contains("100"));
    }

    @Test
    void missingOrNegativeReadingIsRejected() {
        assertNotNull(MeterReadingRules.validate("nước", 0, null));
        assertNotNull(MeterReadingRules.validate("nước", 0, -1));
    }

    @Test
    void nullPreviousTreatedAsZero() {
        assertNull(MeterReadingRules.validate("nước", null, 0));
        assertNull(MeterReadingRules.validate("nước", null, 12));
    }

    @Test
    void averageOfHistory() {
        assertEquals(0, MeterReadingRules.average(List.of()));
        assertEquals(100, MeterReadingRules.average(List.of(90, 100, 110)), 0.0001);
    }

    @Test
    void abnormalOnlyWhenMoreThanThreeTimesAverage() {
        List<Integer> history = List.of(90, 100, 110); // trung bình 100
        assertFalse(MeterReadingRules.isAbnormal(300, history)); // đúng 200% chênh: chưa vượt
        assertTrue(MeterReadingRules.isAbnormal(301, history));
        assertFalse(MeterReadingRules.isAbnormal(50, history));
    }

    @Test
    void noWarningWithoutHistoryOrZeroAverage() {
        assertFalse(MeterReadingRules.isAbnormal(1000, List.of()));
        assertFalse(MeterReadingRules.isAbnormal(1000, List.of(0, 0, 0)));
    }
}
