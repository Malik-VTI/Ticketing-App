package com.train_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCoachRequest {
    @NotNull(message = "Train schedule ID is required")
    private UUID trainScheduleId;

    @NotBlank(message = "Coach number is required")
    private String coachNumber;

    @NotBlank(message = "Coach type is required")
    private String coachType; // economy, business, executive
}

