package com.train_service.controller;

import com.train_service.dto.request.*;
import com.train_service.entity.*;
import com.train_service.service.AdminTrainService;
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
@RequestMapping("/admin/trains")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminTrainController {
    private final AdminTrainService adminService;

    // Station endpoints
    @GetMapping("/stations")
    public ResponseEntity<Page<Station>> getAllStations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllStations(pageable));
    }

    @GetMapping("/stations/{id}")
    public ResponseEntity<Station> getStationById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getStationById(id));
    }

    @PostMapping("/stations")
    public ResponseEntity<Station> createStation(@Valid @RequestBody CreateStationRequest request) {
        return new ResponseEntity<>(adminService.createStation(request), HttpStatus.CREATED);
    }

    @PutMapping("/stations/{id}")
    public ResponseEntity<Station> updateStation(@PathVariable UUID id, @Valid @RequestBody CreateStationRequest request) {
        return ResponseEntity.ok(adminService.updateStation(id, request));
    }

    @DeleteMapping("/stations/{id}")
    public ResponseEntity<Void> deleteStation(@PathVariable UUID id) {
        adminService.deleteStation(id);
        return ResponseEntity.noContent().build();
    }

    // Train endpoints
    @GetMapping("/trains")
    public ResponseEntity<Page<Train>> getAllTrains(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "trainNumber") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllTrains(pageable));
    }

    @GetMapping("/trains/{id}")
    public ResponseEntity<Train> getTrainById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getTrainById(id));
    }

    @PostMapping("/trains")
    public ResponseEntity<Train> createTrain(@Valid @RequestBody CreateTrainRequest request) {
        return new ResponseEntity<>(adminService.createTrain(request), HttpStatus.CREATED);
    }

    @PutMapping("/trains/{id}")
    public ResponseEntity<Train> updateTrain(@PathVariable UUID id, @Valid @RequestBody CreateTrainRequest request) {
        return ResponseEntity.ok(adminService.updateTrain(id, request));
    }

    @DeleteMapping("/trains/{id}")
    public ResponseEntity<Void> deleteTrain(@PathVariable UUID id) {
        adminService.deleteTrain(id);
        return ResponseEntity.noContent().build();
    }

    // Schedule endpoints
    @GetMapping("/schedules")
    public ResponseEntity<Page<TrainSchedule>> getAllSchedules(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "departureDate") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllSchedules(pageable));
    }

    @GetMapping("/schedules/{id}")
    public ResponseEntity<TrainSchedule> getScheduleById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getScheduleById(id));
    }

    @PostMapping("/schedules")
    public ResponseEntity<TrainSchedule> createSchedule(@Valid @RequestBody CreateTrainScheduleRequest request) {
        return new ResponseEntity<>(adminService.createSchedule(request), HttpStatus.CREATED);
    }

    @PutMapping("/schedules/{id}")
    public ResponseEntity<TrainSchedule> updateSchedule(@PathVariable UUID id, @Valid @RequestBody CreateTrainScheduleRequest request) {
        return ResponseEntity.ok(adminService.updateSchedule(id, request));
    }

    @DeleteMapping("/schedules/{id}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable UUID id) {
        adminService.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }

    // Coach endpoints
    @GetMapping("/coaches")
    public ResponseEntity<Page<Coach>> getAllCoaches(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "coachNumber") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllCoaches(pageable));
    }

    @GetMapping("/coaches/{id}")
    public ResponseEntity<Coach> getCoachById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getCoachById(id));
    }

    @PostMapping("/coaches")
    public ResponseEntity<Coach> createCoach(@Valid @RequestBody CreateCoachRequest request) {
        return new ResponseEntity<>(adminService.createCoach(request), HttpStatus.CREATED);
    }

    @PutMapping("/coaches/{id}")
    public ResponseEntity<Coach> updateCoach(@PathVariable UUID id, @Valid @RequestBody CreateCoachRequest request) {
        return ResponseEntity.ok(adminService.updateCoach(id, request));
    }

    @DeleteMapping("/coaches/{id}")
    public ResponseEntity<Void> deleteCoach(@PathVariable UUID id) {
        adminService.deleteCoach(id);
        return ResponseEntity.noContent().build();
    }

    // Seat endpoints
    @GetMapping("/seats")
    public ResponseEntity<Page<CoachSeat>> getAllSeats(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "seatNumber") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(adminService.getAllSeats(pageable));
    }

    @GetMapping("/seats/{id}")
    public ResponseEntity<CoachSeat> getSeatById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getSeatById(id));
    }

    @PostMapping("/seats")
    public ResponseEntity<CoachSeat> createSeat(@Valid @RequestBody CreateCoachSeatRequest request) {
        return new ResponseEntity<>(adminService.createSeat(request), HttpStatus.CREATED);
    }

    @PutMapping("/seats/{id}")
    public ResponseEntity<CoachSeat> updateSeat(@PathVariable UUID id, @Valid @RequestBody CreateCoachSeatRequest request) {
        return ResponseEntity.ok(adminService.updateSeat(id, request));
    }

    @DeleteMapping("/seats/{id}")
    public ResponseEntity<Void> deleteSeat(@PathVariable UUID id) {
        adminService.deleteSeat(id);
        return ResponseEntity.noContent().build();
    }
}

