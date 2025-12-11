package com.flight_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAirlineRequest {
    @NotBlank(message = "Airline code is required")
    @Size(max = 10, message = "Airline code must not exceed 10 characters")
    private String code;

    @NotBlank(message = "Airline name is required")
    private String name;
}


