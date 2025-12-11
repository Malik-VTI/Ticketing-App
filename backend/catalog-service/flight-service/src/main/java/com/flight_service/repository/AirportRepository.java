package com.flight_service.repository;

import com.flight_service.entity.Airport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AirportRepository extends JpaRepository<Airport, UUID> {
    Optional<Airport> findByCode(String code);
    boolean existsByCode(String code);
    List<Airport> findByCity(String city);
    List<Airport> findByCountry(String country);
}

