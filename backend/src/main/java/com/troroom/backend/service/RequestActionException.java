package com.troroom.backend.service;

import org.springframework.http.HttpStatus;

/** Lỗi nghiệp vụ khi Chủ nhà xử lý yêu cầu (S2-08). Controller đổi thành phản hồi JSON {message, code}. */
public class RequestActionException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public RequestActionException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}