package com.admin_service.controller;

import com.admin_service.dto.MetricsResponse;
import com.admin_service.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/metrics")
    public ResponseEntity<MetricsResponse> getMetrics(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        // Here we could hypothetically check if the User (whose id is "X-User-Id") is actually an admin.
        // For the scope of Phase 4 and since the architecture relies on API Gateway JWT valid check,
        // we assume valid requests are permitted to view dashboard metrics.
        return ResponseEntity.ok(adminService.getDashboardMetrics());
    }
}
