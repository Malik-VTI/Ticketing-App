package com.flight_service.service;

import com.flight_service.dto.FareInfo;
import com.flight_service.dto.FlightScheduleDTO;
import com.flight_service.dto.FlightSeatDTO;
import com.flight_service.dto.SeatInfo;
import com.flight_service.entity.*;
import com.flight_service.exception.ResourceNotFoundException;
import com.flight_service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FlightService {
    private final FlightRepository flightRepository;
    private final FlightScheduleRepository scheduleRepository;
    private final FlightSeatRepository seatRepository;
    private final FlightFareRepository fareRepository;
    private final AirlineRepository airlineRepository;
    private final AirportRepository airportRepository;

    public List<FlightScheduleDTO> getSchedules(UUID originId, UUID destinationId, LocalDate date) {
        List<FlightSchedule> schedules = scheduleRepository.findByRouteAndDate(originId, destinationId, date);
        return schedules.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public FlightScheduleDTO getScheduleById(UUID scheduleId) {
        FlightSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("FlightSchedule", scheduleId));
        return convertToDTO(schedule);
    }

    public Page<FlightScheduleDTO> getAllSchedules(Pageable pageable) {
        Page<FlightSchedule> schedules = scheduleRepository.findAllWithDetails(pageable); // changed
        return schedules.map(this::convertToDTO);
    }

    public List<FlightSeatDTO> getSeatsBySchedule(UUID scheduleId) {
        List<FlightSeat> seats = seatRepository.findByFlightScheduleId(scheduleId);
        return seats.stream()
                .map(this::convertSeatToDTO)
                .collect(Collectors.toList());
    }

    public List<FlightSeatDTO> getAvailableSeatsBySchedule(UUID scheduleId) {
        // Match aggregate logic: Spring Data / JPQL status equality is case-sensitive and can return no rows.
        return seatRepository.findByFlightScheduleId(scheduleId).stream()
                .filter(s -> "available".equalsIgnoreCase(s.getStatus()))
                .map(this::convertSeatToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void reserveSeats(UUID scheduleId, List<String> seatNumbers) {
        // Same pattern as train: avoid IN-query returning multiple rows per label; trim + case-insensitive match.
        List<String> wanted = seatNumbers.stream()
                .map(s -> s == null ? "" : s.trim())
                .collect(Collectors.toList());

        List<FlightSeat> allForSchedule = seatRepository.findByFlightScheduleId(scheduleId);
        List<FlightSeat> matched = new ArrayList<>(wanted.size());
        Set<UUID> pickedIds = new HashSet<>();

        for (String label : wanted) {
            if (label.isEmpty()) {
                throw new ResourceNotFoundException("Empty seat number in request for schedule " + scheduleId);
            }
            FlightSeat pick = allForSchedule.stream()
                    .filter(s -> !pickedIds.contains(s.getId()))
                    .filter(s -> s.getSeatNumber() != null && label.equalsIgnoreCase(s.getSeatNumber().trim()))
                    .filter(s -> "available".equalsIgnoreCase(s.getStatus()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Seat " + label + " not found or not available for schedule " + scheduleId));

            matched.add(pick);
            pickedIds.add(pick.getId());
        }

        for (FlightSeat seat : matched) {
            seat.setStatus("booked");
        }

        seatRepository.saveAll(matched);
    }

    public List<FlightScheduleDTO> searchByAirportNames(
            String originName, String destinationName, LocalDate date) {
        List<FlightSchedule> schedules = scheduleRepository
                .findByAirportNamesAndDate(originName, destinationName, date);
        return schedules.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    private FlightScheduleDTO convertToDTO(FlightSchedule schedule) {
        FlightScheduleDTO dto = new FlightScheduleDTO();
        Flight flight = schedule.getFlight();
        
        dto.setId(schedule.getId());
        dto.setFlightId(flight.getId());
        dto.setFlightNumber(flight.getFlightNumber());
        dto.setAirlineName(flight.getAirline().getName());
        dto.setAirlineCode(flight.getAirline().getCode());
        dto.setOriginAirportId(flight.getOriginAirport().getId());
        dto.setOriginAirportCode(flight.getOriginAirport().getCode());
        dto.setOriginAirportName(flight.getOriginAirport().getName());
        dto.setOriginCity(flight.getOriginAirport().getCity());
        dto.setDestinationAirportId(flight.getDestinationAirport().getId());
        dto.setDestinationAirportCode(flight.getDestinationAirport().getCode());
        dto.setDestinationAirportName(flight.getDestinationAirport().getName());
        dto.setDestinationCity(flight.getDestinationAirport().getCity());
        dto.setDepartureTime(schedule.getDepartureTime());
        dto.setArrivalTime(schedule.getArrivalTime());
        dto.setDepartureDate(schedule.getDepartureDate());
        dto.setDurationMinutes(flight.getDurationMinutes());
        dto.setStatus(schedule.getStatus());

        // Get available seats count by class
        List<FlightSeat> seats = seatRepository.findByFlightScheduleId(schedule.getId());
        dto.setAvailableSeats(seats.stream()
                .collect(Collectors.groupingBy(FlightSeat::getSeatClass))
                .entrySet().stream()
                .map(entry -> {
                    long available = entry.getValue().stream()
                            .filter(s -> "available".equalsIgnoreCase(s.getStatus()))
                            .count();
                    return new SeatInfo(
                            entry.getKey(),
                            (int) available,
                            entry.getValue().size()
                    );
                })
                .collect(Collectors.toList()));

        // Get fares
        List<FlightFare> fares = fareRepository.findByFlightScheduleId(schedule.getId());
        dto.setFares(fares.stream()
                .map(f -> new FareInfo(
                        f.getSeatClass(),
                        f.getBasePrice(),
                        f.getCurrency()
                ))
                .collect(Collectors.toList()));

        return dto;
    }

    private FlightSeatDTO convertSeatToDTO(FlightSeat seat) {
        FlightSeatDTO dto = new FlightSeatDTO();
        dto.setId(seat.getId());
        dto.setFlightScheduleId(seat.getFlightSchedule().getId());
        dto.setSeatNumber(seat.getSeatNumber());
        dto.setSeatClass(seat.getSeatClass());
        dto.setStatus(seat.getStatus());
        return dto;
    }
}

