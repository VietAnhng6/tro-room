package com.troroom.backend.service;

import java.util.Map;

/** Lỗi nghiệp vụ của S3-05, mang theo mã lỗi và dữ liệu bổ sung để trả về cho giao diện. */
public class MeterReadingException extends RuntimeException {

    private final int status;
    private final String code;
    private final Map<String, Object> extra;

    public MeterReadingException(int status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public MeterReadingException(int status, String code, String message, Map<String, Object> extra) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = extra;
    }

    public int getStatus() { return status; }
    public String getCode() { return code; }
    public Map<String, Object> getExtra() { return extra; }
}
