package com.troroom.backend.service;

import java.util.List;

/**
 * S3-05: các quy tắc thuần tuý cho chỉ số điện nước, tách riêng để kiểm thử tự động.
 */
public final class MeterReadingRules {

    /**
     * Cảnh báo khi mức tiêu thụ chênh quá 200% so với trung bình,
     * tức lớn hơn 3 lần trung bình (trung bình + 200% của trung bình).
     */
    public static final double WARNING_RATIO = 3.0;

    private MeterReadingRules() {
    }

    /**
     * Kiểm tra một chỉ số mới.
     *
     * @return thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ
     */
    public static String validate(String label, Integer previous, Integer current) {
        if (current == null) {
            return "Vui lòng nhập chỉ số " + label;
        }
        if (current < 0) {
            return "Chỉ số " + label + " không được âm";
        }
        int prev = previous == null ? 0 : previous;
        if (current < prev) {
            return "Chỉ số " + label + " mới (" + current
                    + ") không được nhỏ hơn chỉ số kỳ trước (" + prev + ")";
        }
        return null;
    }

    /**
     * Trung bình mức tiêu thụ của các kỳ gần nhất (tối đa 3 kỳ do nơi gọi truyền vào).
     * Trả về 0 nếu chưa có lịch sử.
     */
    public static double average(List<Integer> usedHistory) {
        if (usedHistory == null || usedHistory.isEmpty()) {
            return 0;
        }
        long sum = 0;
        for (int used : usedHistory) {
            sum += used;
        }
        return (double) sum / usedHistory.size();
    }

    /**
     * Mức tiêu thụ bất thường: có lịch sử, trung bình lớn hơn 0 và
     * mức mới vượt quá {@link #WARNING_RATIO} lần trung bình.
     */
    public static boolean isAbnormal(int used, List<Integer> usedHistory) {
        double avg = average(usedHistory);
        return avg > 0 && used > avg * WARNING_RATIO;
    }
}
