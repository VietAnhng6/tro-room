package com.troroom.backend.dto;

public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private String role;

    public LoginResponse(
            String accessToken,
            String refreshToken,
            String role
    ) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.role = role;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public String getRole() {
        return role;
    }
}