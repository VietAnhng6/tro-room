package com.troroom.backend.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;

/**
 * S4-04: Các quy tắc tính tiền khi trả phòng và tất toán, tách riêng để kiểm
 * thử tự động.
 *
 * Chỉ chứa phép tính thuần tuý, không truy cập cơ sở dữ liệu.
 */
public final class CheckoutCalculator {

    private CheckoutCalculator() {
    }

    /**
     * Số ngày ở thực tế trong kỳ cuối (bao gồm cả hai đầu mút).
     *
     * Nếu hợp đồng bắt đầu trong chính kỳ cuối (khách vào ở và trả phòng trong
     * cùng một tháng), mốc bắt đầu là ngày bắt đầu hợp đồng; ngược lại mốc bắt
     * đầu là ngày đầu tháng của kỳ trả phòng.
     */
    public static int finalPeriodDays(
            LocalDate checkoutDate,
            LocalDate contractStartDate
    ) {
        if (checkoutDate == null) {
            throw new IllegalArgumentException("Ngày trả phòng không được để trống");
        }

        YearMonth period = YearMonth.from(checkoutDate);
        LocalDate start = contractStartDate != null
                && YearMonth.from(contractStartDate).equals(period)
                ? contractStartDate
                : period.atDay(1);

        int days = (int) ChronoUnit.DAYS.between(start, checkoutDate) + 1;
        if (days < 1) {
            throw new IllegalArgumentException("Số ngày ở thực tế phải lớn hơn 0");
        }
        return days;
    }

    /**
     * Tính tiền phòng theo tỉ lệ số ngày ở thực tế trên số ngày của tháng,
     * làm tròn đến đồng gần nhất.
     */
    public static long proRateRent(
            long monthlyRent,
            int days,
            int daysInMonth
    ) {
        if (monthlyRent < 0) {
            throw new IllegalArgumentException("Tiền phòng không được âm");
        }
        if (daysInMonth < 1 || days < 1 || days > daysInMonth) {
            throw new IllegalArgumentException("Số ngày tính tiền phòng không hợp lệ");
        }
        // Làm tròn nửa lên: (rent * days + daysInMonth/2) / daysInMonth.
        return (monthlyRent * days + daysInMonth / 2) / daysInMonth;
    }

    /**
     * Tổng các khoản khấu trừ (hư hỏng, phạt cọc) đều là số dương.
     */
    public static long sumDeductions(long... amounts) {
        long total = 0;
        for (long amount : amounts) {
            if (amount < 0) {
                throw new IllegalArgumentException("Khoản khấu trừ không được âm");
            }
            total = Math.addExact(total, amount);
        }
        return total;
    }

    /**
     * Số tiền hoàn lại cho khách sau khi trừ các khoản khấu trừ, công nợ cũ và
     * hoá đơn kỳ cuối. Kết quả âm nghĩa là khách còn phải trả thêm.
     */
    public static long netRefund(
            long deposit,
            long totalDeductions,
            long previousDebt,
            long finalInvoiceAmount
    ) {
        return Math.subtractExact(
                deposit,
                Math.addExact(
                        totalDeductions,
                        Math.addExact(previousDebt, finalInvoiceAmount)
                )
        );
    }

    /**
     * Kiểm tra chỉ số cuối không được nhỏ hơn lần chốt gần nhất.
     */
    public static boolean isReadingValid(int finalReading, int lastReading) {
        return finalReading >= lastReading;
    }
}
