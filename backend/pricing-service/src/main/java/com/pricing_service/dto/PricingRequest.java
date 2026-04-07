package com.pricing_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PricingRequest {
    private BigDecimal basePrice;
    private Double taxRate;
    private Double discount;
    private Integer quantity;
    private String couponCode;
    private String currency;
}
