package com.train_service.repository;

import com.train_service.entity.CoachSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CoachSeatRepository extends JpaRepository<CoachSeat, UUID> {
    List<CoachSeat> findByCoachId(UUID coachId);
    List<CoachSeat> findByCoachIdAndStatus(UUID coachId, String status);
    List<CoachSeat> findByCoachIdAndSeatClass(UUID coachId, String seatClass);
    
    @Query("SELECT cs FROM CoachSeat cs WHERE cs.coach.trainSchedule.id = :scheduleId")
    List<CoachSeat> findByTrainScheduleId(@Param("scheduleId") UUID scheduleId);
    
    @Query("SELECT cs FROM CoachSeat cs WHERE cs.coach.trainSchedule.id = :scheduleId AND cs.status = 'available'")
    List<CoachSeat> findAvailableSeatsBySchedule(@Param("scheduleId") UUID scheduleId);
    
    @Query("SELECT cs FROM CoachSeat cs WHERE cs.coach.trainSchedule.id = :scheduleId " +
           "AND cs.seatClass = :seatClass AND cs.status = 'available'")
    List<CoachSeat> findAvailableSeatsByScheduleAndClass(@Param("scheduleId") UUID scheduleId, 
                                                          @Param("seatClass") String seatClass);
    
    Optional<CoachSeat> findByCoachIdAndSeatNumber(UUID coachId, String seatNumber);
    
    @Query("SELECT cs FROM CoachSeat cs WHERE cs.coach.trainSchedule.id = :scheduleId AND cs.seatNumber IN :seatNumbers")
    List<CoachSeat> findByScheduleIdAndSeatNumberIn(@Param("scheduleId") UUID scheduleId, @Param("seatNumbers") List<String> seatNumbers);
}

