package com.flight_service.repository;

import com.flight_service.entity.FlightFare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlightFareRepository extends JpaRepository<FlightFare, UUID> {
    List<FlightFare> findByFlightScheduleId(UUID flightScheduleId);
    
    @Query("SELECT ff FROM FlightFare ff WHERE ff.flightSchedule.id = :scheduleId AND ff.seatClass = :seatClass")
    Optional<FlightFare> findByScheduleIdAndSeatClass(@Param("scheduleId") UUID scheduleId, 
                                                      @Param("seatClass") String seatClass);
}

