package com.train_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTrainRequest {
    @NotBlank(message = "Train number is required")
    private String trainNumber;

    @NotBlank(message = "Operator is required")
    private String operator;
}

