package com.troroom.backend.service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.troroom.backend.dto.AdminCreateUserRequest;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.troroom.backend.dto.AdminUserResponse;

import java.util.UUID;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public String createStaffAccount(AdminCreateUserRequest request) {

        // Chỉ cho phép tạo LANDLORD hoặc MANAGER
        if (request.getRole() != User.Role.LANDLORD
                && request.getRole() != User.Role.MANAGER) {
            throw new RuntimeException(
                    "Admin chỉ được tạo tài khoản LANDLORD hoặc MANAGER"
            );
        }

        // Kiểm tra trùng số điện thoại
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException(
                    "Số điện thoại đã được sử dụng"
            );
        }

        // Kiểm tra trùng email
        if (request.getEmail() != null
                && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {

            throw new RuntimeException(
                    "Email đã được sử dụng"
            );
        }

        // Tạo mật khẩu tạm
        String temporaryPassword = generateTemporaryPassword();

        User user = new User();

        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());

        // Lưu mật khẩu dưới dạng BCrypt
        user.setPassword(
                passwordEncoder.encode(temporaryPassword)
        );

        // Tài khoản mới được kích hoạt
        user.setActive(true);

        // Bắt buộc đổi mật khẩu khi đăng nhập lần đầu
        user.setMustChangePassword(true);

        userRepository.save(user);

        // Tạm thời trả mật khẩu để test.
        // Sau này sẽ gửi mật khẩu này qua email.
        return temporaryPassword;
    }

    private String generateTemporaryPassword() {

        // Lấy 8 ký tự đầu của UUID
        String randomPart =
                UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 8);

        return "Tmp@" + randomPart + "1";
    }
    public void lockUser(Long userId) {

    User user = userRepository.findById(userId)
            .orElseThrow(() ->
                    new RuntimeException("Không tìm thấy tài khoản"));

    // Không cho khóa tài khoản ADMIN
    if (user.getRole() == User.Role.ADMIN) {
        throw new RuntimeException(
                "Không thể khóa tài khoản ADMIN"
        );
    }

    user.setActive(false);

    userRepository.save(user);
}

    public void unlockUser(Long userId) {

        User user = userRepository.findById(userId)
            .orElseThrow(() ->
                    new RuntimeException("Không tìm thấy tài khoản"));

        user.setActive(true);

    userRepository.save(user);
    }  
    public Page<AdminUserResponse> getUsers(
        User.Role role,
        Boolean active,
        Pageable pageable) {

    Page<User> users;

    if (role != null && active != null) {
        users = userRepository.findByRoleAndActive(
                role,
                active,
                pageable
        );

    } else if (role != null) {
        users = userRepository.findByRole(
                role,
                pageable
        );

    } else if (active != null) {
        users = userRepository.findByActive(
                active,
                pageable
        );

    } else {
    users = userRepository.findByRoleIn(
            java.util.List.of(
                    User.Role.LANDLORD,
                    User.Role.MANAGER
            ),
            pageable
    );
}

    return users.map(AdminUserResponse::new);
}
}