package com.pricing_service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HotelSearchRequest {
    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "Check-in date is required")
    private String checkin;

    @NotBlank(message = "Check-out date is required")
    private String checkout;

    @NotNull(message = "Number of guests is required")
    @Min(value = 1, message = "At least 1 guest required")
    private Integer guests;
}
