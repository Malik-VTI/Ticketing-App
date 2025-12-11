package com.flight_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatInfo {
    private String seatClass;
    private Integer availableCount;
    private Integer totalCount;
}
