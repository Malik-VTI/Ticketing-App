package com.flight_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FlightScheduleDTO {
    private UUID id;
    private UUID flightId;
    private String flightNumber;
    private String airlineName;
    private String airlineCode;
    private UUID originAirportId;
    private String originAirportCode;
    private String originAirportName;
    private String originCity;
    private UUID destinationAirportId;
    private String destinationAirportCode;
    private String destinationAirportName;
    private String destinationCity;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private LocalDate departureDate;
    private Integer durationMinutes;
    private String status;
    private List<SeatInfo> availableSeats;
    private List<FareInfo> fares;
}


