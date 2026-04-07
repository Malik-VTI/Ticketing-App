package com.flight_service.controller;

import com.flight_service.dto.FlightScheduleDTO;
import com.flight_service.dto.FlightSeatDTO;
import com.flight_service.dto.request.ReserveSeatsRequest;
import com.flight_service.exception.ResourceNotFoundException;
import com.flight_service.service.FlightService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/flights")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FlightController {
    private final FlightService flightService;

    @GetMapping("/schedules")
    public ResponseEntity<?> getSchedules(
            @RequestParam(required = false) UUID origin,
            @RequestParam(required = false) UUID destination,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "departureTime") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        
        // If search parameters provided, use search method
        if (origin != null && destination != null && date != null) {
            List<FlightScheduleDTO> schedules = flightService.getSchedules(origin, destination, date);
            return ResponseEntity.ok(schedules);
        }
        
        // Otherwise, return paginated list
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<FlightScheduleDTO> schedules = flightService.getAllSchedules(pageable);
        return ResponseEntity.ok(schedules);
    }

    @GetMapping("/search")
    public ResponseEntity<List<FlightScheduleDTO>> searchByNames(
            @RequestParam String originName,
            @RequestParam String destinationName,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<FlightScheduleDTO> result = flightService.searchByAirportNames(
                originName, destinationName, date);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/schedules/{id}")
    public ResponseEntity<FlightScheduleDTO> getScheduleById(@PathVariable UUID id) {
        FlightScheduleDTO schedule = flightService.getScheduleById(id);
        return ResponseEntity.ok(schedule);
    }

    @GetMapping("/schedules/{id}/seats")
    public ResponseEntity<List<FlightSeatDTO>> getSeatsBySchedule(@PathVariable UUID id) {
        List<FlightSeatDTO> seats = flightService.getSeatsBySchedule(id);
        return ResponseEntity.ok(seats);
    }

    @GetMapping("/schedules/{id}/seats/available")
    public ResponseEntity<List<FlightSeatDTO>> getAvailableSeatsBySchedule(@PathVariable UUID id) {
        List<FlightSeatDTO> seats = flightService.getAvailableSeatsBySchedule(id);
        return ResponseEntity.ok(seats);
    }

    @PostMapping("/schedules/{id}/reserve")
    public ResponseEntity<?> reserveSeats(@PathVariable UUID id, @Valid @RequestBody ReserveSeatsRequest request) {
        try {
            flightService.reserveSeats(id, request.getSeatNumbers());
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Flight Service is running");
    }
}

