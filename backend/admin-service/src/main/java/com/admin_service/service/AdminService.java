package com.admin_service.service;

import com.admin_service.dto.MetricsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final JdbcTemplate jdbcTemplate;

    public MetricsResponse getDashboardMetrics() {
        Long totalUsers = queryCountSafe("SELECT COUNT(*) FROM users");
        Long totalBookings = queryCountSafe("SELECT COUNT(*) FROM bookings");
        BigDecimal totalRevenue = queryDecimalSafe("SELECT SUM(total_amount) FROM bookings WHERE status != 'cancelled'");
        
        Long totalFlights = queryCountSafe("SELECT COUNT(*) FROM flight_schedules");
        if (totalFlights == 0) {
            totalFlights = queryCountSafe("SELECT COUNT(*) FROM flight_schedule");
        }
        
        Long totalTrains = queryCountSafe("SELECT COUNT(*) FROM train_schedules");
        if (totalTrains == 0) {
            totalTrains = queryCountSafe("SELECT COUNT(*) FROM train_schedule");
        }
        
        Long totalHotels = queryCountSafe("SELECT COUNT(*) FROM hotels");
        if (totalHotels == 0) {
            totalHotels = queryCountSafe("SELECT COUNT(*) FROM hotel");
        }

        return MetricsResponse.builder()
                .totalUsers(totalUsers)
                .totalBookings(totalBookings)
                .totalRevenue(totalRevenue)
                .totalFlights(totalFlights)
                .totalTrains(totalTrains)
                .totalHotels(totalHotels)
                .build();
    }

    private Long queryCountSafe(String sql) {
        try {
            Long result = jdbcTemplate.queryForObject(sql, Long.class);
            return result != null ? result : 0L;
        } catch (Exception e) {
            return 0L;
        }
    }

    private BigDecimal queryDecimalSafe(String sql) {
        try {
            BigDecimal result = jdbcTemplate.queryForObject(sql, BigDecimal.class);
            return result != null ? result : BigDecimal.ZERO;
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
