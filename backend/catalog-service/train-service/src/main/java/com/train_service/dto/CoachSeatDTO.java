package com.train_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CoachSeatDTO {
    private UUID id;
    private UUID coachId;
    private UUID trainScheduleId;
    private String coachNumber;
    private String seatNumber;
    private String seatClass;
    private String status;
}

