package com.train_service.service;

import com.train_service.dto.CoachSeatDTO;
import com.train_service.dto.SeatInfo;
import com.train_service.dto.TrainScheduleDTO;
import com.train_service.entity.*;
import com.train_service.exception.ResourceNotFoundException;
import com.train_service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrainService {
    private final TrainRepository trainRepository;
    private final TrainScheduleRepository scheduleRepository;
    private final CoachSeatRepository seatRepository;
    private final StationRepository stationRepository;
    private final CoachRepository coachRepository;

    public List<TrainScheduleDTO> getSchedules(UUID originId, UUID destinationId, LocalDate date) {
        List<TrainSchedule> schedules = scheduleRepository.findByRouteAndDate(originId, destinationId, date);
        return schedules.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public TrainScheduleDTO getScheduleById(UUID scheduleId) {
        TrainSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("TrainSchedule", scheduleId));
        return convertToDTO(schedule);
    }

    public Page<TrainScheduleDTO> getAllSchedules(Pageable pageable) {
        Page<TrainSchedule> schedules = scheduleRepository.findAll(pageable);
        return schedules.map(this::convertToDTO);
    }

    public List<CoachSeatDTO> getSeatsBySchedule(UUID scheduleId) {
        List<CoachSeat> seats = seatRepository.findByTrainScheduleId(scheduleId);
        return seats.stream()
                .map(this::convertSeatToDTO)
                .collect(Collectors.toList());
    }

    public List<CoachSeatDTO> getAvailableSeatsBySchedule(UUID scheduleId) {
        List<CoachSeat> seats = seatRepository.findAvailableSeatsBySchedule(scheduleId);
        return seats.stream()
                .map(this::convertSeatToDTO)
                .collect(Collectors.toList());
    }

    private TrainScheduleDTO convertToDTO(TrainSchedule schedule) {
        TrainScheduleDTO dto = new TrainScheduleDTO();
        Train train = schedule.getTrain();
        
        dto.setId(schedule.getId());
        dto.setTrainId(train.getId());
        dto.setTrainNumber(train.getTrainNumber());
        dto.setOperator(train.getOperator());
        dto.setDepartureStationId(schedule.getDepartureStation().getId());
        dto.setDepartureStationCode(schedule.getDepartureStation().getCode());
        dto.setDepartureStationName(schedule.getDepartureStation().getName());
        dto.setDepartureCity(schedule.getDepartureStation().getCity());
        dto.setArrivalStationId(schedule.getArrivalStation().getId());
        dto.setArrivalStationCode(schedule.getArrivalStation().getCode());
        dto.setArrivalStationName(schedule.getArrivalStation().getName());
        dto.setArrivalCity(schedule.getArrivalStation().getCity());
        dto.setDepartureTime(schedule.getDepartureTime());
        dto.setArrivalTime(schedule.getArrivalTime());
        dto.setDepartureDate(schedule.getDepartureDate());
        dto.setStatus(schedule.getStatus());

        // Get available seats count by class
        List<CoachSeat> seats = seatRepository.findByTrainScheduleId(schedule.getId());
        dto.setAvailableSeats(seats.stream()
                .collect(Collectors.groupingBy(CoachSeat::getSeatClass))
                .entrySet().stream()
                .map(entry -> {
                    long available = entry.getValue().stream()
                            .filter(s -> "available".equals(s.getStatus()))
                            .count();
                    return new SeatInfo(
                            entry.getKey(),
                            (int) available,
                            entry.getValue().size()
                    );
                })
                .collect(Collectors.toList()));

        return dto;
    }

    private CoachSeatDTO convertSeatToDTO(CoachSeat seat) {
        CoachSeatDTO dto = new CoachSeatDTO();
        dto.setId(seat.getId());
        dto.setCoachId(seat.getCoach().getId());
        dto.setTrainScheduleId(seat.getCoach().getTrainSchedule().getId());
        dto.setCoachNumber(seat.getCoach().getCoachNumber());
        dto.setSeatNumber(seat.getSeatNumber());
        dto.setSeatClass(seat.getSeatClass());
        dto.setStatus(seat.getStatus());
        return dto;
    }
}

