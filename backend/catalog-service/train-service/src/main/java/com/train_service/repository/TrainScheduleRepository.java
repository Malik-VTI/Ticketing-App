package com.train_service.repository;

import com.train_service.entity.TrainSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrainScheduleRepository extends JpaRepository<TrainSchedule, UUID> {
    List<TrainSchedule> findByTrainId(UUID trainId);
    List<TrainSchedule> findByDepartureDate(LocalDate departureDate);
    List<TrainSchedule> findByStatus(String status);
    
    @Query("SELECT ts FROM TrainSchedule ts WHERE ts.train.id = :trainId AND ts.departureDate = :date")
    List<TrainSchedule> findByTrainIdAndDate(@Param("trainId") UUID trainId, @Param("date") LocalDate date);
    
    @Query("SELECT ts FROM TrainSchedule ts WHERE ts.departureStation.id = :originId " +
           "AND ts.arrivalStation.id = :destinationId AND ts.departureDate = :date")
    List<TrainSchedule> findByRouteAndDate(@Param("originId") UUID originId, 
                                            @Param("destinationId") UUID destinationId, 
                                            @Param("date") LocalDate date);
}

