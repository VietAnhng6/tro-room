package com.troroom.backend.service;

import com.troroom.backend.entity.InvoiceItem;
import com.troroom.backend.entity.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * S3-06: các quy tắc tính tiền hoá đơn, tách riêng để kiểm thử tự động.
 *
 * Chỉ chứa phép tính thuần tuý: tiền phòng, điện/nước theo chỉ số nhân đơn giá,
 * dịch vụ cố định theo phòng và khoản khoán theo đầu người. Mọi giá trị đơn giá
 * và số người đều đã được {@link InvoiceService} tra cứu theo ngày chốt kỳ trước
 * khi truyền vào đây.
 */
public final class InvoiceCalculator {

    private InvoiceCalculator() {
    }

    /** Một dịch vụ không tính theo chỉ số (cố định hoặc khoán theo đầu người). */
    public record PricedService(
            String name,
            String unit,
            Service.CalculationMethod method,
            long price
    ) {
    }

    /** Một dòng khoản mục đã tính xong. */
    public record Line(
            String label,
            InvoiceItem.Type type,
            int quantity,
            String unit,
            long unitPrice,
            long amount,
            Integer previousReading,
            Integer currentReading
    ) {
    }

    /** Kết quả: danh sách dòng và tổng cộng. */
    public record Result(List<Line> lines, long total) {
    }

    /**
     * Tính các dòng khoản mục và tổng tiền hoá đơn.
     *
     * @param rent                    tiền phòng một tháng
     * @param electricityPrev         chỉ số điện đầu kỳ (null nếu không tính theo chỉ số)
     * @param electricity             chỉ số điện cuối kỳ
     * @param electricityUnitPrice    đơn giá điện một đơn vị
     * @param electricityUnit         đơn vị tính của điện (VD: kWh)
     * @param waterPrev               chỉ số nước đầu kỳ
     * @param water                   chỉ số nước cuối kỳ
     * @param waterUnitPrice          đơn giá nước một đơn vị
     * @param waterUnit               đơn vị tính của nước (VD: m³)
     * @param occupantCount           số người ở (gồm người đứng tên và người ở ghép)
     * @param services                các dịch vụ cố định / theo đầu người
     */
    public static Result compute(
            long rent,
            Integer electricityPrev,
            Integer electricity,
            long electricityUnitPrice,
            String electricityUnit,
            Integer waterPrev,
            Integer water,
            long waterUnitPrice,
            String waterUnit,
            int occupantCount,
            List<PricedService> services
    ) {
        List<Line> lines = new ArrayList<>();

        lines.add(new Line(
                "Tiền phòng",
                InvoiceItem.Type.RENT,
                1,
                "tháng",
                rent,
                rent,
                null,
                null
        ));

        if (electricityPrev != null && electricity != null) {
            int used = electricity - electricityPrev;
            lines.add(new Line(
                    "Tiền điện",
                    InvoiceItem.Type.ELECTRICITY,
                    used,
                    electricityUnit,
                    electricityUnitPrice,
                    used * electricityUnitPrice,
                    electricityPrev,
                    electricity
            ));
        }

        if (waterPrev != null && water != null) {
            int used = water - waterPrev;
            lines.add(new Line(
                    "Tiền nước",
                    InvoiceItem.Type.WATER,
                    used,
                    waterUnit,
                    waterUnitPrice,
                    used * waterUnitPrice,
                    waterPrev,
                    water
            ));
        }

        if (services != null) {
            for (PricedService s : services) {
                if (s.method() == Service.CalculationMethod.BY_PERSON) {
                    lines.add(new Line(
                            s.name(),
                            InvoiceItem.Type.PERSON_SERVICE,
                            occupantCount,
                            s.unit(),
                            s.price(),
                            occupantCount * s.price(),
                            null,
                            null
                    ));
                } else {
                    lines.add(new Line(
                            s.name(),
                            InvoiceItem.Type.FIXED_SERVICE,
                            1,
                            s.unit(),
                            s.price(),
                            s.price(),
                            null,
                            null
                    ));
                }
            }
        }

        long total = 0;
        for (Line line : lines) {
            total += line.amount();
        }

        return new Result(List.copyOf(lines), total);
    }
}
