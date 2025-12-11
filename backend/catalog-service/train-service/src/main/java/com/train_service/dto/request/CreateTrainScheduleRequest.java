package com.train_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CreateTrainScheduleRequest {
    @NotNull(message = "Train ID is required")
    private UUID trainId;

    @NotNull(message = "Departure station ID is required")
    private UUID departureStationId;

    @NotNull(message = "Arrival station ID is required")
    private UUID arrivalStationId;

    @NotNull(message = "Departure time is required")
    private LocalDateTime departureTime;

    @NotNull(message = "Arrival time is required")
    private LocalDateTime arrivalTime;

    @NotNull(message = "Departure date is required")
    private LocalDate departureDate;

    @NotBlank(message = "Status is required")
    private String status; // scheduled, delayed, cancelled, completed
}

