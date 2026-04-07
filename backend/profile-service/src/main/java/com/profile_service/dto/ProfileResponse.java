package com.profile_service.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class ProfileResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private String createdAt;
}
