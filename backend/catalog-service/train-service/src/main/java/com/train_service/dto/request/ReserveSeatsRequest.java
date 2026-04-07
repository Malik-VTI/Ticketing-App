package com.train_service.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ReserveSeatsRequest {
    @NotEmpty(message = "Seat numbers are required for reservation")
    private List<String> seatNumbers;
    
    private String seatClass; // Optional, can be used for secondary validation
}
