package com.flight_service.repository;

import com.flight_service.entity.FlightSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlightScheduleRepository extends JpaRepository<FlightSchedule, UUID> {
    List<FlightSchedule> findByFlightId(UUID flightId);
    List<FlightSchedule> findByDepartureDate(LocalDate departureDate);
    List<FlightSchedule> findByStatus(String status);
    
    @Query("SELECT fs FROM FlightSchedule fs WHERE fs.flight.id = :flightId AND fs.departureDate = :date")
    List<FlightSchedule> findByFlightIdAndDate(@Param("flightId") UUID flightId, @Param("date") LocalDate date);
    
    @Query("SELECT fs FROM FlightSchedule fs WHERE fs.flight.originAirport.id = :originId " +
           "AND fs.flight.destinationAirport.id = :destinationId AND fs.departureDate = :date")
    List<FlightSchedule> findByRouteAndDate(@Param("originId") UUID originId, 
                                            @Param("destinationId") UUID destinationId, 
                                            @Param("date") LocalDate date);
}

