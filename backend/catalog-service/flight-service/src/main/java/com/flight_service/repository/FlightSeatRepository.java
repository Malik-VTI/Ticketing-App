package com.flight_service.repository;

import com.flight_service.entity.FlightSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlightSeatRepository extends JpaRepository<FlightSeat, UUID> {
    List<FlightSeat> findByFlightScheduleId(UUID flightScheduleId);
    List<FlightSeat> findByFlightScheduleIdAndStatus(UUID flightScheduleId, String status);
    List<FlightSeat> findByFlightScheduleIdAndSeatClass(UUID flightScheduleId, String seatClass);
    
    @Query("SELECT fs FROM FlightSeat fs WHERE fs.flightSchedule.id = :scheduleId " +
           "AND fs.seatClass = :seatClass AND fs.status = 'available'")
    List<FlightSeat> findAvailableSeatsByScheduleAndClass(@Param("scheduleId") UUID scheduleId, 
                                                           @Param("seatClass") String seatClass);
    
    Optional<FlightSeat> findByFlightScheduleIdAndSeatNumber(UUID flightScheduleId, String seatNumber);
}

