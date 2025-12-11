package com.train_service.repository;

import com.train_service.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StationRepository extends JpaRepository<Station, UUID> {
    Optional<Station> findByCode(String code);
    boolean existsByCode(String code);
    List<Station> findByCity(String city);
}

