package com.pricing_service.service;

import com.pricing_service.dto.PricingResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PricingService {

    private static final BigDecimal TAX_RATE = new BigDecimal("0.10");

    public PricingResponse calculatePrice(BigDecimal basePrice, String couponCode) {
        BigDecimal tax = basePrice.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal discount = calculateDiscount(basePrice, couponCode);
        BigDecimal totalPrice = basePrice.add(tax).subtract(discount).setScale(2, RoundingMode.HALF_UP);

        return PricingResponse.builder()
                .basePrice(basePrice)
                .tax(tax)
                .discount(discount)
                .totalPrice(totalPrice)
                .currency("USD")
                .build();
    }

    private BigDecimal calculateDiscount(BigDecimal basePrice, String couponCode) {
        if (couponCode == null || couponCode.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return switch (couponCode.toUpperCase()) {
            case "SAVE10" -> basePrice.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
            case "SAVE20" -> basePrice.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP);
            default -> BigDecimal.ZERO;
        };
    }
}
