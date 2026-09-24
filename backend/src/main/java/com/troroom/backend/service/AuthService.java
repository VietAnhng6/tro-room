package com.troroom.backend.service;

import com.troroom.backend.dto.LoginRequest;
import com.troroom.backend.dto.LoginResponse;
import com.troroom.backend.dto.RegisterRequest;
import com.troroom.backend.entity.RefreshToken;
import com.troroom.backend.entity.User;
import com.troroom.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        RefreshTokenService refreshTokenService
) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.refreshTokenService = refreshTokenService;
}

    public User register(RegisterRequest request) {
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Số điện thoại đã được sử dụng");
        }

        if (request.getEmail() != null
                && !request.getEmail().isBlank()
                && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng");
        }

        User user = new User();
        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.TENANT);

        return userRepository.save(user);
    }

    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByPhone(request.getIdentifier())
                .orElseGet(() ->
                        userRepository.findByEmail(request.getIdentifier())
                                .orElse(null)
                );

       if (user == null) {
    throw new RuntimeException("Thông tin đăng nhập không chính xác");
}
if (!user.isActive()) {
    throw new RuntimeException("Tài khoản đang bị khóa");
}

if (user.getLockedUntil() != null
        && user.getLockedUntil().isAfter(java.time.LocalDateTime.now())) {
    throw new RuntimeException("Tài khoản đang bị khóa");
}

if (!passwordEncoder.matches(
        request.getPassword(),
        user.getPassword()
)) {

    int attempts = user.getFailedLoginAttempts() + 1;
    user.setFailedLoginAttempts(attempts);

    if (attempts >= 5) {
        user.setLockedUntil(
                java.time.LocalDateTime.now().plusMinutes(15)
        );
        user.setFailedLoginAttempts(0);
    }

    userRepository.save(user);

    throw new RuntimeException("Thông tin đăng nhập không chính xác");
}
user.setFailedLoginAttempts(0);
user.setLockedUntil(null);
userRepository.save(user);

      String accessToken = jwtService.generateAccessToken(user);

        RefreshToken refreshToken =
        refreshTokenService.createRefreshToken(user);

     return new LoginResponse(
        accessToken,
        refreshToken.getToken(),
        user.getRole().name(),
        user.isMustChangePassword()
        );
    }
    public LoginResponse refreshAccessToken(String token) {

    RefreshToken refreshToken =
            refreshTokenService.getValidRefreshToken(token);

   User user = refreshToken.getUser();

if (!user.isActive()) {
    throw new RuntimeException("Tài khoản đang bị khóa");
}

String newAccessToken =
        jwtService.generateAccessToken(user);

   return new LoginResponse(
    newAccessToken,
    refreshToken.getToken(),
    user.getRole().name(),
    user.isMustChangePassword()
    )  ;
    }  
    public void changePassword(
        Long userId,
        String currentPassword,
        String newPassword
) {
    User user = userRepository.findById(userId)
            .orElseThrow(() ->
                    new RuntimeException("Không tìm thấy tài khoản"));

    if (!passwordEncoder.matches(
            currentPassword,
            user.getPassword()
    )) {
        throw new RuntimeException("Mật khẩu hiện tại không chính xác");
    }

    user.setPassword(passwordEncoder.encode(newPassword));
    user.setMustChangePassword(false);

    userRepository.save(user);
    } 
}
