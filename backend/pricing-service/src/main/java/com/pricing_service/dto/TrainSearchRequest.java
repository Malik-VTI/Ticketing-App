package com.pricing_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TrainSearchRequest {
    @NotBlank(message = "Origin is required")
    private String from;

    @NotBlank(message = "Destination is required")
    private String to;

    @NotBlank(message = "Date is required")
    private String date;
}
