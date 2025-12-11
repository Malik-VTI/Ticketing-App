package com.train_service.service;

import com.train_service.dto.request.*;
import com.train_service.entity.*;
import com.train_service.exception.ResourceNotFoundException;
import com.train_service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminTrainService {
    private final StationRepository stationRepository;
    private final TrainRepository trainRepository;
    private final TrainScheduleRepository scheduleRepository;
    private final CoachRepository coachRepository;
    private final CoachSeatRepository seatRepository;

    // Station CRUD
    public Page<Station> getAllStations(Pageable pageable) {
        return stationRepository.findAll(pageable);
    }

    public Station getStationById(UUID id) {
        return stationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Station", id));
    }

    public Station createStation(CreateStationRequest request) {
        if (stationRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Station with code " + request.getCode() + " already exists");
        }
        Station station = new Station();
        station.setCode(request.getCode());
        station.setName(request.getName());
        station.setCity(request.getCity());
        return stationRepository.save(station);
    }

    public Station updateStation(UUID id, CreateStationRequest request) {
        Station station = getStationById(id);
        if (!station.getCode().equals(request.getCode()) && stationRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Station with code " + request.getCode() + " already exists");
        }
        station.setCode(request.getCode());
        station.setName(request.getName());
        station.setCity(request.getCity());
        return stationRepository.save(station);
    }

    public void deleteStation(UUID id) {
        Station station = getStationById(id);
        stationRepository.delete(station);
    }

    // Train CRUD
    public Page<Train> getAllTrains(Pageable pageable) {
        return trainRepository.findAll(pageable);
    }

    public Train getTrainById(UUID id) {
        return trainRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Train", id));
    }

    public Train createTrain(CreateTrainRequest request) {
        if (trainRepository.existsByTrainNumber(request.getTrainNumber())) {
            throw new IllegalArgumentException("Train with number " + request.getTrainNumber() + " already exists");
        }
        Train train = new Train();
        train.setTrainNumber(request.getTrainNumber());
        train.setOperator(request.getOperator());
        return trainRepository.save(train);
    }

    public Train updateTrain(UUID id, CreateTrainRequest request) {
        Train train = getTrainById(id);
        if (!train.getTrainNumber().equals(request.getTrainNumber()) && trainRepository.existsByTrainNumber(request.getTrainNumber())) {
            throw new IllegalArgumentException("Train with number " + request.getTrainNumber() + " already exists");
        }
        train.setTrainNumber(request.getTrainNumber());
        train.setOperator(request.getOperator());
        return trainRepository.save(train);
    }

    public void deleteTrain(UUID id) {
        Train train = getTrainById(id);
        trainRepository.delete(train);
    }

    // Train Schedule CRUD
    public Page<TrainSchedule> getAllSchedules(Pageable pageable) {
        return scheduleRepository.findAll(pageable);
    }

    public TrainSchedule getScheduleById(UUID id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TrainSchedule", id));
    }

    @Transactional
    public TrainSchedule createSchedule(CreateTrainScheduleRequest request) {
        Train train = getTrainById(request.getTrainId());
        Station departureStation = getStationById(request.getDepartureStationId());
        Station arrivalStation = getStationById(request.getArrivalStationId());

        if (departureStation.getId().equals(arrivalStation.getId())) {
            throw new IllegalArgumentException("Departure and arrival stations cannot be the same");
        }

        if (request.getArrivalTime().isBefore(request.getDepartureTime())) {
            throw new IllegalArgumentException("Arrival time must be after departure time");
        }

        TrainSchedule schedule = new TrainSchedule();
        schedule.setTrain(train);
        schedule.setDepartureStation(departureStation);
        schedule.setArrivalStation(arrivalStation);
        schedule.setDepartureTime(request.getDepartureTime());
        schedule.setArrivalTime(request.getArrivalTime());
        schedule.setDepartureDate(request.getDepartureDate());
        schedule.setStatus(request.getStatus());
        return scheduleRepository.save(schedule);
    }

    @Transactional
    public TrainSchedule updateSchedule(UUID id, CreateTrainScheduleRequest request) {
        TrainSchedule schedule = getScheduleById(id);
        Train train = getTrainById(request.getTrainId());
        Station departureStation = getStationById(request.getDepartureStationId());
        Station arrivalStation = getStationById(request.getArrivalStationId());

        if (departureStation.getId().equals(arrivalStation.getId())) {
            throw new IllegalArgumentException("Departure and arrival stations cannot be the same");
        }

        if (request.getArrivalTime().isBefore(request.getDepartureTime())) {
            throw new IllegalArgumentException("Arrival time must be after departure time");
        }

        schedule.setTrain(train);
        schedule.setDepartureStation(departureStation);
        schedule.setArrivalStation(arrivalStation);
        schedule.setDepartureTime(request.getDepartureTime());
        schedule.setArrivalTime(request.getArrivalTime());
        schedule.setDepartureDate(request.getDepartureDate());
        schedule.setStatus(request.getStatus());
        return scheduleRepository.save(schedule);
    }

    public void deleteSchedule(UUID id) {
        TrainSchedule schedule = getScheduleById(id);
        scheduleRepository.delete(schedule);
    }

    // Coach CRUD
    public Page<Coach> getAllCoaches(Pageable pageable) {
        return coachRepository.findAll(pageable);
    }

    public Coach getCoachById(UUID id) {
        return coachRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coach", id));
    }

    @Transactional
    public Coach createCoach(CreateCoachRequest request) {
        TrainSchedule schedule = getScheduleById(request.getTrainScheduleId());

        Coach coach = new Coach();
        coach.setTrainSchedule(schedule);
        coach.setCoachNumber(request.getCoachNumber());
        coach.setCoachType(request.getCoachType());
        return coachRepository.save(coach);
    }

    @Transactional
    public Coach updateCoach(UUID id, CreateCoachRequest request) {
        Coach coach = getCoachById(id);
        TrainSchedule schedule = getScheduleById(request.getTrainScheduleId());

        coach.setTrainSchedule(schedule);
        coach.setCoachNumber(request.getCoachNumber());
        coach.setCoachType(request.getCoachType());
        return coachRepository.save(coach);
    }

    public void deleteCoach(UUID id) {
        Coach coach = getCoachById(id);
        coachRepository.delete(coach);
    }

    // Coach Seat CRUD
    public Page<CoachSeat> getAllSeats(Pageable pageable) {
        return seatRepository.findAll(pageable);
    }

    public CoachSeat getSeatById(UUID id) {
        return seatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CoachSeat", id));
    }

    @Transactional
    public CoachSeat createSeat(CreateCoachSeatRequest request) {
        Coach coach = getCoachById(request.getCoachId());

        // Check if seat already exists
        seatRepository.findByCoachIdAndSeatNumber(coach.getId(), request.getSeatNumber())
                .ifPresent(s -> {
                    throw new IllegalArgumentException("Seat " + request.getSeatNumber() + " already exists for this coach");
                });

        CoachSeat seat = new CoachSeat();
        seat.setCoach(coach);
        seat.setSeatNumber(request.getSeatNumber());
        seat.setSeatClass(request.getSeatClass());
        seat.setStatus(request.getStatus());
        return seatRepository.save(seat);
    }

    @Transactional
    public CoachSeat updateSeat(UUID id, CreateCoachSeatRequest request) {
        CoachSeat seat = getSeatById(id);
        Coach coach = getCoachById(request.getCoachId());

        // Check if seat number conflicts with another seat
        seatRepository.findByCoachIdAndSeatNumber(coach.getId(), request.getSeatNumber())
                .ifPresent(s -> {
                    if (!s.getId().equals(id)) {
                        throw new IllegalArgumentException("Seat " + request.getSeatNumber() + " already exists for this coach");
                    }
                });

        seat.setCoach(coach);
        seat.setSeatNumber(request.getSeatNumber());
        seat.setSeatClass(request.getSeatClass());
        seat.setStatus(request.getStatus());
        return seatRepository.save(seat);
    }

    public void deleteSeat(UUID id) {
        CoachSeat seat = getSeatById(id);
        seatRepository.delete(seat);
    }
}

