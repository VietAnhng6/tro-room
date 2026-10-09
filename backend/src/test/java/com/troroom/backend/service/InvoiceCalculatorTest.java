package com.troroom.backend.service;

import com.troroom.backend.entity.Service;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** S3-06: kiểm thử quy tắc tính tiền hoá đơn. */
class InvoiceCalculatorTest {

    @Test
    void rentPlusMeteredElectricityAndWater() {
        // 1.500.000 tiền phòng + (120-100)=20 kWh * 4.000 + (10-5)=5 m³ * 18.000
        InvoiceCalculator.Result r = InvoiceCalculator.compute(
                1_500_000L,
                100, 120, 4_000L, "kWh",
                5, 10, 18_000L, "m³",
                1,
                List.of());

        long expected = 1_500_000L + 20 * 4_000L + 5 * 18_000L;
        assertEquals(expected, r.total());
        assertEquals(3, r.lines().size());
    }

    @Test
    void fixedAndPerPersonServicesAreAdded() {
        List<InvoiceCalculator.PricedService> services = List.of(
                new InvoiceCalculator.PricedService("Rác", "phòng",
                        Service.CalculationMethod.FIXED_ROOM, 30_000L),
                new InvoiceCalculator.PricedService("Gửi xe", "người",
                        Service.CalculationMethod.BY_PERSON, 100_000L));

        // 3 người ở -> gửi xe = 3 * 100.000
        InvoiceCalculator.Result r = InvoiceCalculator.compute(
                2_000_000L,
                100, 110, 4_000L, "kWh",
                0, 2, 18_000L, "m³",
                3,
                services);

        long expected = 2_000_000L + 10 * 4_000L + 2 * 18_000L
                + 30_000L + 3 * 100_000L;
        assertEquals(expected, r.total());
        assertEquals(5, r.lines().size());
    }

    @Test
    void nullReadingsSkipMeterLines() {
        // Điện/nước không tính theo chỉ số -> chỉ còn tiền phòng.
        InvoiceCalculator.Result r = InvoiceCalculator.compute(
                1_000_000L,
                null, null, 0L, "kWh",
                null, null, 0L, "m³",
                1,
                List.of());

        assertEquals(1_000_000L, r.total());
        assertEquals(1, r.lines().size());
    }

    @Test
    void meterLineKeepsReadingsForAudit() {
        InvoiceCalculator.Result r = InvoiceCalculator.compute(
                0L,
                250, 300, 4_000L, "kWh",
                null, null, 0L, "m³",
                1,
                List.of());

        InvoiceCalculator.Line elec = r.lines().stream()
                .filter(l -> l.type().name().equals("ELECTRICITY"))
                .findFirst()
                .orElseThrow();
        assertEquals(250, elec.previousReading());
        assertEquals(300, elec.currentReading());
        assertEquals(50, elec.quantity());
        assertEquals(50 * 4_000L, elec.amount());
    }

    @Test
    void totalMatchesSumOfLineAmounts() {
        InvoiceCalculator.Result r = InvoiceCalculator.compute(
                1_200_000L,
                10, 15, 4_000L, "kWh",
                3, 8, 18_000L, "m³",
                2,
                List.of(new InvoiceCalculator.PricedService("Internet", "phòng",
                        Service.CalculationMethod.FIXED_ROOM, 120_000L)));

        long sum = r.lines().stream().mapToLong(InvoiceCalculator.Line::amount).sum();
        assertEquals(sum, r.total());
    }
}
