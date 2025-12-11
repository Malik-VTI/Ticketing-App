package com.flight_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateFlightSeatRequest {
    @NotNull(message = "Flight schedule ID is required")
    private UUID flightScheduleId;

    @NotBlank(message = "Seat number is required")
    private String seatNumber;

    @NotBlank(message = "Seat class is required")
    private String seatClass; // economy, business, first

    @NotBlank(message = "Status is required")
    private String status; // available, held, booked
}


