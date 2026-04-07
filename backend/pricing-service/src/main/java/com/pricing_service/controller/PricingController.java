package com.pricing_service.controller;

import com.pricing_service.dto.PricingRequest;
import com.pricing_service.dto.PricingResponse;
import com.pricing_service.service.PricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/pricing")
@RequiredArgsConstructor
public class PricingController {

    private final PricingService pricingService;

    @GetMapping("/calculate")
    public ResponseEntity<PricingResponse> calculatePrice(
            @RequestParam BigDecimal basePrice,
            @RequestParam(required = false) String couponCode,
            @RequestParam(required = false, defaultValue = "IDR") String currency) {
        return ResponseEntity.ok(pricingService.calculatePrice(basePrice, couponCode, currency));
    }

    @PostMapping("/calculate")
    public ResponseEntity<PricingResponse> calculatePrice(@RequestBody PricingRequest request) {
        return ResponseEntity.ok(pricingService.calculatePrice(request));
    }
}
