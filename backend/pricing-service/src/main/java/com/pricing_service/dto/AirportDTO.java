package com.pricing_service.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class AirportDTO {
    private UUID id;
    private String code;
    private String name;
    private String city;
    private String country;
}

