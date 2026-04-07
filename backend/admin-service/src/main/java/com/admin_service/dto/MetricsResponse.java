package com.admin_service.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class MetricsResponse {
    private long totalUsers;
    private long totalBookings;
    private BigDecimal totalRevenue;
    private long totalFlights;
    private long totalTrains;
    private long totalHotels;
}
