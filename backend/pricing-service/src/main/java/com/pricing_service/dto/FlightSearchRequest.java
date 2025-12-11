package com.pricing_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FlightSearchRequest {
    @NotBlank(message = "Origin is required")
    private String from;

    @NotBlank(message = "Destination is required")
    private String to;

    @NotBlank(message = "Date is required")
    private String date;

    @NotNull(message = "Number of adults is required")
    @Min(value = 1, message = "At least 1 adult required")
    private Integer adults;

    @Min(value = 0, message = "Children cannot be negative")
    private Integer children = 0;
}
