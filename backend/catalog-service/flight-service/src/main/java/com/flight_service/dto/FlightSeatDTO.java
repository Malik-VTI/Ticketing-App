package com.flight_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FlightSeatDTO {
    private UUID id;
    private UUID flightScheduleId;
    private String seatNumber;
    private String seatClass;
    private String status;
}

