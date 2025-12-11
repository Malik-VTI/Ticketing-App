package com.train_service.repository;

import com.train_service.entity.Coach;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CoachRepository extends JpaRepository<Coach, UUID> {
    List<Coach> findByTrainScheduleId(UUID trainScheduleId);
    List<Coach> findByTrainScheduleIdAndCoachType(UUID trainScheduleId, String coachType);
}

