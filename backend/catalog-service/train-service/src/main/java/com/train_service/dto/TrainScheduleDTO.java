package com.train_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrainScheduleDTO {
    private UUID id;
    private UUID trainId;
    private String trainNumber;
    private String operator;
    private UUID departureStationId;
    private String departureStationCode;
    private String departureStationName;
    private String departureCity;
    private UUID arrivalStationId;
    private String arrivalStationCode;
    private String arrivalStationName;
    private String arrivalCity;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private LocalDate departureDate;
    private String status;
    private List<SeatInfo> availableSeats;
}

