package com.flight_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateFlightFareRequest {
    @NotNull(message = "Flight schedule ID is required")
    private UUID flightScheduleId;

    @NotBlank(message = "Seat class is required")
    private String seatClass; // economy, business, first

    @NotNull(message = "Base price is required")
    @Positive(message = "Base price must be positive")
    private BigDecimal basePrice;

    @NotBlank(message = "Currency is required")
    private String currency;

    private String rules; // JSON string for fare rules
}


