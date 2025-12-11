package com.pricing_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingResponse {
    private BigDecimal basePrice;
    private BigDecimal tax;
    private BigDecimal discount;
    private BigDecimal totalPrice;
    private String currency;
}
