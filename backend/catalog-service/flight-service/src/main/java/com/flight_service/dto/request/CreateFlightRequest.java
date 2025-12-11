package com.flight_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateFlightRequest {
    @NotNull(message = "Airline ID is required")
    private UUID airlineId;

    @NotBlank(message = "Flight number is required")
    private String flightNumber;

    @NotNull(message = "Origin airport ID is required")
    private UUID originAirportId;

    @NotNull(message = "Destination airport ID is required")
    private UUID destinationAirportId;

    @NotNull(message = "Duration in minutes is required")
    @Positive(message = "Duration must be positive")
    private Integer durationMinutes;
}


