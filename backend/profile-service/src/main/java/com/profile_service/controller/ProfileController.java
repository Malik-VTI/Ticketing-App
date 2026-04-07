package com.profile_service.controller;

import com.profile_service.dto.PasswordUpdateRequest;
import com.profile_service.dto.ProfileResponse;
import com.profile_service.dto.ProfileUpdateRequest;
import com.profile_service.model.User;
import com.profile_service.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/profile")
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<?> getProfile(@RequestHeader(value = "X-User-Id", required = false) String userIdHeader) {
        if (userIdHeader == null || userIdHeader.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            UUID userId = UUID.fromString(userIdHeader);
            Optional<User> userOpt = userRepository.findById(userId);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }

            User user = userOpt.get();
            ProfileResponse response = new ProfileResponse();
            response.setId(user.getId());
            response.setEmail(user.getEmail());
            response.setFullName(user.getFullName());
            response.setPhone(user.getPhone());
            if (user.getCreatedAt() != null) {
                response.setCreatedAt(user.getCreatedAt().toString());
            }

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid User ID"));
        }
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody ProfileUpdateRequest request) {
        
        if (userIdHeader == null || userIdHeader.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            UUID userId = UUID.fromString(userIdHeader);
            Optional<User> userOpt = userRepository.findById(userId);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }

            User user = userOpt.get();
            
            if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
                user.setFullName(request.getFullName().trim());
            }
            if (request.getPhone() != null) {
                user.setPhone(request.getPhone().trim());
            }

            userRepository.save(user);

            ProfileResponse response = new ProfileResponse();
            response.setId(user.getId());
            response.setEmail(user.getEmail());
            response.setFullName(user.getFullName());
            response.setPhone(user.getPhone());
            if (user.getCreatedAt() != null) {
                response.setCreatedAt(user.getCreatedAt().toString());
            }

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid User ID"));
        }
    }

    @PutMapping("/password")
    public ResponseEntity<?> updatePassword(
            @RequestHeader(value = "X-User-Id", required = false) String userIdHeader,
            @RequestBody PasswordUpdateRequest request) {

        if (userIdHeader == null || userIdHeader.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        if (request.getCurrentPassword() == null || request.getNewPassword() == null ||
            request.getCurrentPassword().isEmpty() || request.getNewPassword().length() < 8) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid password data. New password must be at least 8 characters."));
        }

        try {
            UUID userId = UUID.fromString(userIdHeader);
            Optional<User> userOpt = userRepository.findById(userId);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }

            User user = userOpt.get();

            // Verify current password
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Incorrect current password"));
            }

            // Update password
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid User ID"));
        }
    }
}
