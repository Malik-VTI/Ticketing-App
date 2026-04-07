package com.pricing_service.service;

import com.pricing_service.dto.PricingResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PricingService {

    private static final BigDecimal TAX_RATE = new BigDecimal("0.10");

    public PricingResponse calculatePrice(BigDecimal basePrice, String couponCode, String currency) {
        BigDecimal tax = basePrice.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal discount = calculateDiscount(basePrice, couponCode);
        BigDecimal totalPrice = basePrice.add(tax).subtract(discount).setScale(2, RoundingMode.HALF_UP);

        return PricingResponse.builder()
                .basePrice(basePrice)
                .tax(tax)
                .discount(discount)
                .totalPrice(totalPrice)
                .currency(currency)
                .build();
    }

    public PricingResponse calculatePrice(com.pricing_service.dto.PricingRequest request) {
        BigDecimal base = request.getBasePrice() != null ? request.getBasePrice() : BigDecimal.ZERO;
        int qty = request.getQuantity() != null ? request.getQuantity() : 1;
        BigDecimal subtotal = base.multiply(new BigDecimal(qty));
        
        BigDecimal taxRate = request.getTaxRate() != null ? new BigDecimal(request.getTaxRate()) : TAX_RATE;
        BigDecimal tax = subtotal.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        
        BigDecimal disc = calculateDiscount(subtotal, request.getCouponCode());
        BigDecimal total = subtotal.add(tax).subtract(disc).setScale(2, RoundingMode.HALF_UP);

        return PricingResponse.builder()
                .basePrice(base)
                .tax(tax)
                .discount(disc)
                .totalPrice(total)
                .currency(request.getCurrency() != null ? request.getCurrency() : "IDR")
                .build();
    }

    private BigDecimal calculateDiscount(BigDecimal basePrice, String couponCode) {
        if (couponCode == null || couponCode.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return switch (couponCode.toUpperCase()) {
            case "SAVE10" -> basePrice.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
            case "SAVE20" -> basePrice.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP);
            default -> throw new IllegalArgumentException("Invalid promo code: " + couponCode);
        };
    }
}
