package com.flight_service.controller;

import com.flight_service.dto.request.*;
import com.flight_service.entity.*;
import com.flight_service.service.AdminFlightService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/flights")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminFlightController {
    private final AdminFlightService adminService;

    // Airline endpoints
    @GetMapping("/airlines")
    public ResponseEntity<Page<Airline>> getAllAirlines(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllAirlines(pageable));
    }

    @GetMapping("/airlines/{id}")
    public ResponseEntity<Airline> getAirlineById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getAirlineById(id));
    }

    @PostMapping("/airlines")
    public ResponseEntity<Airline> createAirline(@Valid @RequestBody CreateAirlineRequest request) {
        return new ResponseEntity<>(adminService.createAirline(request), HttpStatus.CREATED);
    }

    @PutMapping("/airlines/{id}")
    public ResponseEntity<Airline> updateAirline(@PathVariable UUID id, @Valid @RequestBody CreateAirlineRequest request) {
        return ResponseEntity.ok(adminService.updateAirline(id, request));
    }

    @DeleteMapping("/airlines/{id}")
    public ResponseEntity<Void> deleteAirline(@PathVariable UUID id) {
        adminService.deleteAirline(id);
        return ResponseEntity.noContent().build();
    }

    // Airport endpoints
    @GetMapping("/airports")
    public ResponseEntity<Page<Airport>> getAllAirports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllAirports(pageable));
    }

    @GetMapping("/airports/{id}")
    public ResponseEntity<Airport> getAirportById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getAirportById(id));
    }

    @PostMapping("/airports")
    public ResponseEntity<Airport> createAirport(@Valid @RequestBody CreateAirportRequest request) {
        return new ResponseEntity<>(adminService.createAirport(request), HttpStatus.CREATED);
    }

    @PutMapping("/airports/{id}")
    public ResponseEntity<Airport> updateAirport(@PathVariable UUID id, @Valid @RequestBody CreateAirportRequest request) {
        return ResponseEntity.ok(adminService.updateAirport(id, request));
    }

    @DeleteMapping("/airports/{id}")
    public ResponseEntity<Void> deleteAirport(@PathVariable UUID id) {
        adminService.deleteAirport(id);
        return ResponseEntity.noContent().build();
    }

    // Flight endpoints
    @GetMapping("/flights")
    public ResponseEntity<Page<Flight>> getAllFlights(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "flightNumber") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllFlights(pageable));
    }

    @GetMapping("/flights/{id}")
    public ResponseEntity<Flight> getFlightById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getFlightById(id));
    }

    @PostMapping("/flights")
    public ResponseEntity<Flight> createFlight(@Valid @RequestBody CreateFlightRequest request) {
        return new ResponseEntity<>(adminService.createFlight(request), HttpStatus.CREATED);
    }

    @PutMapping("/flights/{id}")
    public ResponseEntity<Flight> updateFlight(@PathVariable UUID id, @Valid @RequestBody CreateFlightRequest request) {
        return ResponseEntity.ok(adminService.updateFlight(id, request));
    }

    @DeleteMapping("/flights/{id}")
    public ResponseEntity<Void> deleteFlight(@PathVariable UUID id) {
        adminService.deleteFlight(id);
        return ResponseEntity.noContent().build();
    }

    // Schedule endpoints
    @GetMapping("/schedules")
    public ResponseEntity<Page<FlightSchedule>> getAllSchedules(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "departureDate") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllSchedules(pageable));
    }

    @GetMapping("/schedules/{id}")
    public ResponseEntity<FlightSchedule> getScheduleById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getScheduleById(id));
    }

    @PostMapping("/schedules")
    public ResponseEntity<FlightSchedule> createSchedule(@Valid @RequestBody CreateFlightScheduleRequest request) {
        return new ResponseEntity<>(adminService.createSchedule(request), HttpStatus.CREATED);
    }

    @PutMapping("/schedules/{id}")
    public ResponseEntity<FlightSchedule> updateSchedule(@PathVariable UUID id, @Valid @RequestBody CreateFlightScheduleRequest request) {
        return ResponseEntity.ok(adminService.updateSchedule(id, request));
    }

    @DeleteMapping("/schedules/{id}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable UUID id) {
        adminService.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }

    // Seat endpoints
    @GetMapping("/seats")
    public ResponseEntity<Page<FlightSeat>> getAllSeats(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "seatNumber") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllSeats(pageable));
    }

    @GetMapping("/seats/{id}")
    public ResponseEntity<FlightSeat> getSeatById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getSeatById(id));
    }

    @PostMapping("/seats")
    public ResponseEntity<FlightSeat> createSeat(@Valid @RequestBody CreateFlightSeatRequest request) {
        return new ResponseEntity<>(adminService.createSeat(request), HttpStatus.CREATED);
    }

    @PutMapping("/seats/{id}")
    public ResponseEntity<FlightSeat> updateSeat(@PathVariable UUID id, @Valid @RequestBody CreateFlightSeatRequest request) {
        return ResponseEntity.ok(adminService.updateSeat(id, request));
    }

    @DeleteMapping("/seats/{id}")
    public ResponseEntity<Void> deleteSeat(@PathVariable UUID id) {
        adminService.deleteSeat(id);
        return ResponseEntity.noContent().build();
    }

    // Fare endpoints
    @GetMapping("/fares")
    public ResponseEntity<Page<FlightFare>> getAllFares(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "seatClass") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllFares(pageable));
    }

    @GetMapping("/fares/{id}")
    public ResponseEntity<FlightFare> getFareById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getFareById(id));
    }

    @PostMapping("/fares")
    public ResponseEntity<FlightFare> createFare(@Valid @RequestBody CreateFlightFareRequest request) {
        return new ResponseEntity<>(adminService.createFare(request), HttpStatus.CREATED);
    }

    @PutMapping("/fares/{id}")
    public ResponseEntity<FlightFare> updateFare(@PathVariable UUID id, @Valid @RequestBody CreateFlightFareRequest request) {
        return ResponseEntity.ok(adminService.updateFare(id, request));
    }

    @DeleteMapping("/fares/{id}")
    public ResponseEntity<Void> deleteFare(@PathVariable UUID id) {
        adminService.deleteFare(id);
        return ResponseEntity.noContent().build();
    }
}


