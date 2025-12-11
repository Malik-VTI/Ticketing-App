package com.flight_service.repository;

import com.flight_service.entity.Flight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlightRepository extends JpaRepository<Flight, UUID> {
    Optional<Flight> findByFlightNumber(String flightNumber);
    List<Flight> findByAirlineId(UUID airlineId);
    List<Flight> findByOriginAirportId(UUID originAirportId);
    List<Flight> findByDestinationAirportId(UUID destinationAirportId);
    
    @Query("SELECT f FROM Flight f WHERE f.originAirport.id = :originId AND f.destinationAirport.id = :destinationId")
    List<Flight> findByOriginAndDestination(@Param("originId") UUID originId, @Param("destinationId") UUID destinationId);
}

