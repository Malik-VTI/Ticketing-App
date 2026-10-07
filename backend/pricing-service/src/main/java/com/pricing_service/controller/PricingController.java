package com.pricing_service.controller;

import com.pricing_service.dto.PricingRequest;
import com.pricing_service.dto.PricingResponse;
import com.pricing_service.service.PricingService;
import com.pricing_service.logging.LogEvents;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/pricing")
@RequiredArgsConstructor
public class PricingController {

    private static final Logger log = LoggerFactory.getLogger(PricingController.class);

    private final PricingService pricingService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    @GetMapping("/calculate")
    public ResponseEntity<PricingResponse> calculatePrice(
            @RequestParam BigDecimal basePrice,
            @RequestParam(required = false) String couponCode,
            @RequestParam(required = false, defaultValue = "IDR") String currency) {
        PricingResponse response = pricingService.calculatePrice(basePrice, couponCode, currency);
        logCalculated(couponCode, 1, response);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/calculate")
    public ResponseEntity<PricingResponse> calculatePrice(@RequestBody PricingRequest request) {
        PricingResponse response = pricingService.calculatePrice(request);
        logCalculated(request.getCouponCode(), request.getQuantity(), response);
        return ResponseEntity.ok(response);
    }

    private static void logCalculated(String couponCode, Integer quantity, PricingResponse r) {
        LogEvents.business(log, "pricing.calculated", "price calculated", LogEvents.fields(
                "pricing.base_price", r.getBasePrice(),
                "pricing.tax", r.getTax(),
                "pricing.discount", r.getDiscount(),
                "pricing.total_price", r.getTotalPrice(),
                "pricing.currency", r.getCurrency(),
                "pricing.quantity", quantity,
                "pricing.coupon_code", couponCode,
                "pricing.coupon_applied", couponCode != null && !couponCode.isBlank()));
    }
}
