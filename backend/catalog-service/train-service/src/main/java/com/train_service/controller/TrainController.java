package com.train_service.controller;

import com.train_service.dto.CoachSeatDTO;
import com.train_service.dto.TrainScheduleDTO;
import com.train_service.service.TrainService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/trains")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TrainController {
    private final TrainService trainService;

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
            List<TrainScheduleDTO> schedules = trainService.getSchedules(origin, destination, date);
            return ResponseEntity.ok(schedules);
        }
        
        // Otherwise, return paginated list
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<TrainScheduleDTO> schedules = trainService.getAllSchedules(pageable);
        return ResponseEntity.ok(schedules);
    }

    @GetMapping("/schedules/{id}")
    public ResponseEntity<TrainScheduleDTO> getScheduleById(@PathVariable UUID id) {
        TrainScheduleDTO schedule = trainService.getScheduleById(id);
        return ResponseEntity.ok(schedule);
    }

    @GetMapping("/schedules/{id}/seats")
    public ResponseEntity<List<CoachSeatDTO>> getSeatsBySchedule(@PathVariable UUID id) {
        List<CoachSeatDTO> seats = trainService.getSeatsBySchedule(id);
        return ResponseEntity.ok(seats);
    }

    @GetMapping("/schedules/{id}/seats/available")
    public ResponseEntity<List<CoachSeatDTO>> getAvailableSeatsBySchedule(@PathVariable UUID id) {
        List<CoachSeatDTO> seats = trainService.getAvailableSeatsBySchedule(id);
        return ResponseEntity.ok(seats);
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Train Service is running");
    }
}

