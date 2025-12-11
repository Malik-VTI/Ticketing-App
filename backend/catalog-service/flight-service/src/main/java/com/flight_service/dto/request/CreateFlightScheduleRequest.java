package com.flight_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CreateFlightScheduleRequest {
    @NotNull(message = "Flight ID is required")
    private UUID flightId;

    @NotNull(message = "Departure time is required")
    private LocalDateTime departureTime;

    @NotNull(message = "Arrival time is required")
    private LocalDateTime arrivalTime;

    @NotNull(message = "Departure date is required")
    private LocalDate departureDate;

    @NotBlank(message = "Status is required")
    private String status; // scheduled, delayed, cancelled, completed
}


