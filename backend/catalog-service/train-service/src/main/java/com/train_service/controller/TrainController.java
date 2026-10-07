package com.train_service.controller;

import com.train_service.dto.CoachSeatDTO;
import com.train_service.dto.TrainScheduleDTO;
import com.train_service.dto.request.ReserveSeatsRequest;
import com.train_service.exception.ResourceNotFoundException;
import com.train_service.logging.LogEvents;
import com.train_service.service.TrainService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.event.Level;
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
@RequestMapping("/trains")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TrainController {
    private static final Logger log = LoggerFactory.getLogger(TrainController.class);
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
            LogEvents.business(log, "train.searched", "train schedule search executed", LogEvents.fields(
                    "search.origin_id", origin,
                    "search.destination_id", destination,
                    "search.date", date,
                    "search.result_count", schedules.size()));
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

    @PostMapping("/schedules/{id}/reserve")
    public ResponseEntity<?> reserveSeats(@PathVariable UUID id, @Valid @RequestBody ReserveSeatsRequest request) {
        try {
            trainService.reserveSeats(id, request.getSeatNumbers());
            LogEvents.business(log, "train.seats.reserved", "train seats reserved", seatFields(id, request, null));
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            LogEvents.emit(log, Level.WARN, LogEvents.TYPE_BUSINESS, "train.seats.reserve.failed",
                    "seat reservation failed (seat not available)", seatFields(id, request, e));
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (ResourceNotFoundException e) {
            LogEvents.emit(log, Level.WARN, LogEvents.TYPE_BUSINESS, "train.seats.reserve.failed",
                    "seat reservation failed (schedule not found)", seatFields(id, request, e));
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PostMapping("/schedules/{id}/release")
    public ResponseEntity<?> releaseSeats(@PathVariable UUID id, @Valid @RequestBody ReserveSeatsRequest request) {
        try {
            trainService.releaseSeats(id, request.getSeatNumbers());
            LogEvents.business(log, "train.seats.released", "train seats released", seatFields(id, request, null));
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            LogEvents.emit(log, Level.ERROR, LogEvents.TYPE_BUSINESS, "train.seats.release.failed",
                    "seat release failed", seatFields(id, request, e));
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    private static java.util.Map<String, Object> seatFields(UUID scheduleId, ReserveSeatsRequest request, Exception e) {
        return LogEvents.fields(
                "train.schedule_id", scheduleId,
                "seat.class", request.getSeatClass(),
                "seat.count", request.getSeatNumbers() == null ? 0 : request.getSeatNumbers().size(),
                "seat.numbers", request.getSeatNumbers(),
                "error.message", e == null ? null : e.getMessage());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Train Service is running");
    }
}

