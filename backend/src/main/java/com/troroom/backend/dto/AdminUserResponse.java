package com.troroom.backend.dto;

import com.troroom.backend.entity.User;

public class AdminUserResponse {

    private Long id;
    private String name;
    private String phone;
    private String email;
    private User.Role role;
    private boolean active;
    private boolean mustChangePassword;

    public AdminUserResponse(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.phone = user.getPhone();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.active = user.isActive();
        this.mustChangePassword = user.isMustChangePassword();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public User.Role getRole() {
        return role;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }
}