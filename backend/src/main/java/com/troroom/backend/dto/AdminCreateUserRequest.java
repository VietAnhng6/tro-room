package com.troroom.backend.dto;

import com.troroom.backend.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class AdminCreateUserRequest {

    @NotBlank(message = "Họ tên không được để trống")
    private String name;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
        regexp = "^0\\d{9}$",
        message = "Số điện thoại phải có 10 chữ số và bắt đầu bằng 0"
    )
    private String phone;

    @Email(message = "Email không hợp lệ")
    private String email;

    private User.Role role;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public User.Role getRole() {
        return role;
    }

    public void setRole(User.Role role) {
        this.role = role;
    }
}