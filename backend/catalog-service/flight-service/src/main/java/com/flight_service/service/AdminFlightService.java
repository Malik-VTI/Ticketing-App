package com.flight_service.service;

import com.flight_service.dto.request.*;
import com.flight_service.entity.*;
import com.flight_service.exception.ResourceNotFoundException;
import com.flight_service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminFlightService {
    private final AirlineRepository airlineRepository;
    private final AirportRepository airportRepository;
    private final FlightRepository flightRepository;
    private final FlightScheduleRepository scheduleRepository;
    private final FlightSeatRepository seatRepository;
    private final FlightFareRepository fareRepository;

    // Airline CRUD
    public Page<Airline> getAllAirlines(Pageable pageable) {
        return airlineRepository.findAll(pageable);
    }

    public Airline getAirlineById(UUID id) {
        return airlineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Airline", id));
    }

    public Airline createAirline(CreateAirlineRequest request) {
        if (airlineRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Airline with code " + request.getCode() + " already exists");
        }
        Airline airline = new Airline();
        airline.setCode(request.getCode());
        airline.setName(request.getName());
        return airlineRepository.save(airline);
    }

    public Airline updateAirline(UUID id, CreateAirlineRequest request) {
        Airline airline = getAirlineById(id);
        if (!airline.getCode().equals(request.getCode()) && airlineRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Airline with code " + request.getCode() + " already exists");
        }
        airline.setCode(request.getCode());
        airline.setName(request.getName());
        return airlineRepository.save(airline);
    }

    public void deleteAirline(UUID id) {
        Airline airline = getAirlineById(id);
        airlineRepository.delete(airline);
    }

    // Airport CRUD
    public Page<Airport> getAllAirports(Pageable pageable) {
        return airportRepository.findAll(pageable);
    }

    public Airport getAirportById(UUID id) {
        return airportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Airport", id));
    }

    public Airport createAirport(CreateAirportRequest request) {
        if (airportRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Airport with code " + request.getCode() + " already exists");
        }
        Airport airport = new Airport();
        airport.setCode(request.getCode());
        airport.setName(request.getName());
        airport.setCity(request.getCity());
        airport.setCountry(request.getCountry());
        return airportRepository.save(airport);
    }

    public Airport updateAirport(UUID id, CreateAirportRequest request) {
        Airport airport = getAirportById(id);
        if (!airport.getCode().equals(request.getCode()) && airportRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Airport with code " + request.getCode() + " already exists");
        }
        airport.setCode(request.getCode());
        airport.setName(request.getName());
        airport.setCity(request.getCity());
        airport.setCountry(request.getCountry());
        return airportRepository.save(airport);
    }

    public void deleteAirport(UUID id) {
        Airport airport = getAirportById(id);
        airportRepository.delete(airport);
    }

    // Flight CRUD
    public Page<Flight> getAllFlights(Pageable pageable) {
        return flightRepository.findAll(pageable);
    }

    public Flight getFlightById(UUID id) {
        return flightRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flight", id));
    }

    @Transactional
    public Flight createFlight(CreateFlightRequest request) {
        Airline airline = getAirlineById(request.getAirlineId());
        Airport origin = getAirportById(request.getOriginAirportId());
        Airport destination = getAirportById(request.getDestinationAirportId());

        if (origin.getId().equals(destination.getId())) {
            throw new IllegalArgumentException("Origin and destination airports cannot be the same");
        }

        Flight flight = new Flight();
        flight.setAirline(airline);
        flight.setFlightNumber(request.getFlightNumber());
        flight.setOriginAirport(origin);
        flight.setDestinationAirport(destination);
        flight.setDurationMinutes(request.getDurationMinutes());
        return flightRepository.save(flight);
    }

    @Transactional
    public Flight updateFlight(UUID id, CreateFlightRequest request) {
        Flight flight = getFlightById(id);
        Airline airline = getAirlineById(request.getAirlineId());
        Airport origin = getAirportById(request.getOriginAirportId());
        Airport destination = getAirportById(request.getDestinationAirportId());

        if (origin.getId().equals(destination.getId())) {
            throw new IllegalArgumentException("Origin and destination airports cannot be the same");
        }

        flight.setAirline(airline);
        flight.setFlightNumber(request.getFlightNumber());
        flight.setOriginAirport(origin);
        flight.setDestinationAirport(destination);
        flight.setDurationMinutes(request.getDurationMinutes());
        return flightRepository.save(flight);
    }

    public void deleteFlight(UUID id) {
        Flight flight = getFlightById(id);
        flightRepository.delete(flight);
    }

    // Flight Schedule CRUD
    public Page<FlightSchedule> getAllSchedules(Pageable pageable) {
        return scheduleRepository.findAll(pageable);
    }

    public FlightSchedule getScheduleById(UUID id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FlightSchedule", id));
    }

    @Transactional
    public FlightSchedule createSchedule(CreateFlightScheduleRequest request) {
        Flight flight = getFlightById(request.getFlightId());

        if (request.getArrivalTime().isBefore(request.getDepartureTime())) {
            throw new IllegalArgumentException("Arrival time must be after departure time");
        }

        FlightSchedule schedule = new FlightSchedule();
        schedule.setFlight(flight);
        schedule.setDepartureTime(request.getDepartureTime());
        schedule.setArrivalTime(request.getArrivalTime());
        schedule.setDepartureDate(request.getDepartureDate());
        schedule.setStatus(request.getStatus());
        return scheduleRepository.save(schedule);
    }

    @Transactional
    public FlightSchedule updateSchedule(UUID id, CreateFlightScheduleRequest request) {
        FlightSchedule schedule = getScheduleById(id);
        Flight flight = getFlightById(request.getFlightId());

        if (request.getArrivalTime().isBefore(request.getDepartureTime())) {
            throw new IllegalArgumentException("Arrival time must be after departure time");
        }

        schedule.setFlight(flight);
        schedule.setDepartureTime(request.getDepartureTime());
        schedule.setArrivalTime(request.getArrivalTime());
        schedule.setDepartureDate(request.getDepartureDate());
        schedule.setStatus(request.getStatus());
        return scheduleRepository.save(schedule);
    }

    public void deleteSchedule(UUID id) {
        FlightSchedule schedule = getScheduleById(id);
        scheduleRepository.delete(schedule);
    }

    // Flight Seat CRUD
    public Page<FlightSeat> getAllSeats(Pageable pageable) {
        return seatRepository.findAll(pageable);
    }

    public FlightSeat getSeatById(UUID id) {
        return seatRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FlightSeat", id));
    }

    @Transactional
    public FlightSeat createSeat(CreateFlightSeatRequest request) {
        FlightSchedule schedule = getScheduleById(request.getFlightScheduleId());

        // Check if seat already exists
        seatRepository.findByFlightScheduleIdAndSeatNumber(schedule.getId(), request.getSeatNumber())
                .ifPresent(s -> {
                    throw new IllegalArgumentException("Seat " + request.getSeatNumber() + " already exists for this schedule");
                });

        FlightSeat seat = new FlightSeat();
        seat.setFlightSchedule(schedule);
        seat.setSeatNumber(request.getSeatNumber());
        seat.setSeatClass(request.getSeatClass());
        seat.setStatus(request.getStatus());
        return seatRepository.save(seat);
    }

    @Transactional
    public FlightSeat updateSeat(UUID id, CreateFlightSeatRequest request) {
        FlightSeat seat = getSeatById(id);
        FlightSchedule schedule = getScheduleById(request.getFlightScheduleId());

        // Check if seat number conflicts with another seat
        seatRepository.findByFlightScheduleIdAndSeatNumber(schedule.getId(), request.getSeatNumber())
                .ifPresent(s -> {
                    if (!s.getId().equals(id)) {
                        throw new IllegalArgumentException("Seat " + request.getSeatNumber() + " already exists for this schedule");
                    }
                });

        seat.setFlightSchedule(schedule);
        seat.setSeatNumber(request.getSeatNumber());
        seat.setSeatClass(request.getSeatClass());
        seat.setStatus(request.getStatus());
        return seatRepository.save(seat);
    }

    public void deleteSeat(UUID id) {
        FlightSeat seat = getSeatById(id);
        seatRepository.delete(seat);
    }

    // Flight Fare CRUD
    public Page<FlightFare> getAllFares(Pageable pageable) {
        return fareRepository.findAll(pageable);
    }

    public FlightFare getFareById(UUID id) {
        return fareRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FlightFare", id));
    }

    @Transactional
    public FlightFare createFare(CreateFlightFareRequest request) {
        FlightSchedule schedule = getScheduleById(request.getFlightScheduleId());

        // Check if fare already exists for this schedule and class
        fareRepository.findByScheduleIdAndSeatClass(schedule.getId(), request.getSeatClass())
                .ifPresent(f -> {
                    throw new IllegalArgumentException("Fare for seat class " + request.getSeatClass() + " already exists for this schedule");
                });

        FlightFare fare = new FlightFare();
        fare.setFlightSchedule(schedule);
        fare.setSeatClass(request.getSeatClass());
        fare.setBasePrice(request.getBasePrice());
        fare.setCurrency(request.getCurrency());
        fare.setRules(request.getRules());
        return fareRepository.save(fare);
    }

    @Transactional
    public FlightFare updateFare(UUID id, CreateFlightFareRequest request) {
        FlightFare fare = getFareById(id);
        FlightSchedule schedule = getScheduleById(request.getFlightScheduleId());

        // Check if fare conflicts with another fare
        fareRepository.findByScheduleIdAndSeatClass(schedule.getId(), request.getSeatClass())
                .ifPresent(f -> {
                    if (!f.getId().equals(id)) {
                        throw new IllegalArgumentException("Fare for seat class " + request.getSeatClass() + " already exists for this schedule");
                    }
                });

        fare.setFlightSchedule(schedule);
        fare.setSeatClass(request.getSeatClass());
        fare.setBasePrice(request.getBasePrice());
        fare.setCurrency(request.getCurrency());
        fare.setRules(request.getRules());
        return fareRepository.save(fare);
    }

    public void deleteFare(UUID id) {
        FlightFare fare = getFareById(id);
        fareRepository.delete(fare);
    }
}


