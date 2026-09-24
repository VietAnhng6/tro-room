package com.troroom.backend.dto;

public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private String role;
    private boolean mustChangePassword;

    public LoginResponse(
            String accessToken,
            String refreshToken,
            String role,
            boolean mustChangePassword) {

        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.role = role;
        this.mustChangePassword = mustChangePassword;
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

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }
}