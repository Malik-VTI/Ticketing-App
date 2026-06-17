package com.pricing_service.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pricing_service.dto.PricingRequest;
import com.pricing_service.dto.PricingResponse;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Meaningful unit tests for {@link PricingService}.
 *
 * <p>PricingService is a pure component with no external collaborators (no clients, no
 * repositories), so it is instantiated directly rather than mocked. All money math uses BigDecimal
 * with scale 2 (HALF_UP), and tax rate is 10%.
 */
class PricingServiceTest {

  private PricingService pricingService;

  @BeforeEach
  void setUp() {
    pricingService = new PricingService();
  }

  @Nested
  @DisplayName("calculatePrice(basePrice, couponCode, currency)")
  class SimpleCalculate {

    @Test
    @DisplayName("no coupon: applies 10% tax and no discount")
    void noCoupon() {
      PricingResponse response =
          pricingService.calculatePrice(new BigDecimal("100000"), null, "IDR");

      assertThat(response.getBasePrice()).isEqualByComparingTo("100000");
      assertThat(response.getTax()).isEqualByComparingTo("10000.00");
      assertThat(response.getDiscount()).isEqualByComparingTo("0");
      // 100000 + 10000 tax - 0 discount
      assertThat(response.getTotalPrice()).isEqualByComparingTo("110000.00");
      assertThat(response.getCurrency()).isEqualTo("IDR");
    }

    @Test
    @DisplayName("empty coupon string is treated as no discount")
    void emptyCoupon() {
      PricingResponse response = pricingService.calculatePrice(new BigDecimal("100000"), "", "USD");

      assertThat(response.getDiscount()).isEqualByComparingTo("0");
      assertThat(response.getTotalPrice()).isEqualByComparingTo("110000.00");
      assertThat(response.getCurrency()).isEqualTo("USD");
    }

    @Test
    @DisplayName("SAVE10 coupon applies 10% discount on base price")
    void save10Coupon() {
      PricingResponse response =
          pricingService.calculatePrice(new BigDecimal("100000"), "SAVE10", "IDR");

      assertThat(response.getTax()).isEqualByComparingTo("10000.00");
      assertThat(response.getDiscount()).isEqualByComparingTo("10000.00");
      // 100000 + 10000 tax - 10000 discount
      assertThat(response.getTotalPrice()).isEqualByComparingTo("100000.00");
    }

    @Test
    @DisplayName("SAVE20 coupon applies 20% discount on base price")
    void save20Coupon() {
      PricingResponse response =
          pricingService.calculatePrice(new BigDecimal("100000"), "SAVE20", "IDR");

      assertThat(response.getDiscount()).isEqualByComparingTo("20000.00");
      // 100000 + 10000 tax - 20000 discount
      assertThat(response.getTotalPrice()).isEqualByComparingTo("90000.00");
    }

    @Test
    @DisplayName("coupon code is case-insensitive")
    void couponCaseInsensitive() {
      PricingResponse lower =
          pricingService.calculatePrice(new BigDecimal("100000"), "save10", "IDR");
      PricingResponse upper =
          pricingService.calculatePrice(new BigDecimal("100000"), "SAVE10", "IDR");

      assertThat(lower.getDiscount()).isEqualByComparingTo(upper.getDiscount());
      assertThat(lower.getTotalPrice()).isEqualByComparingTo(upper.getTotalPrice());
    }

    @Test
    @DisplayName("invalid coupon throws IllegalArgumentException")
    void invalidCoupon() {
      assertThatThrownBy(
              () -> pricingService.calculatePrice(new BigDecimal("100000"), "BOGUS", "IDR"))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("BOGUS");
    }

    @Test
    @DisplayName("tax rounds to 2 decimals HALF_UP")
    void taxRounding() {
      // 12345 * 0.10 = 1234.50 exactly
      PricingResponse response =
          pricingService.calculatePrice(new BigDecimal("12345"), null, "IDR");

      assertThat(response.getTax()).isEqualByComparingTo("1234.50");
      assertThat(response.getTotalPrice()).isEqualByComparingTo("13579.50");
    }

    @Test
    @DisplayName("zero base price yields zero tax, discount and total")
    void zeroBasePrice() {
      PricingResponse response = pricingService.calculatePrice(BigDecimal.ZERO, null, "IDR");

      assertThat(response.getTax()).isEqualByComparingTo("0.00");
      assertThat(response.getDiscount()).isEqualByComparingTo("0");
      assertThat(response.getTotalPrice()).isEqualByComparingTo("0.00");
    }
  }

  @Nested
  @DisplayName("calculatePrice(PricingRequest)")
  class RequestCalculate {

    @Test
    @DisplayName("quantity multiplies the subtotal before tax and discount")
    void quantityMultiplies() {
      PricingRequest request = new PricingRequest();
      request.setBasePrice(new BigDecimal("50000"));
      request.setQuantity(3);
      request.setCurrency("IDR");

      PricingResponse response = pricingService.calculatePrice(request);

      // subtotal = 50000 * 3 = 150000
      assertThat(response.getBasePrice()).isEqualByComparingTo("50000");
      assertThat(response.getTax()).isEqualByComparingTo("15000.00");
      assertThat(response.getDiscount()).isEqualByComparingTo("0");
      assertThat(response.getTotalPrice()).isEqualByComparingTo("165000.00");
      assertThat(response.getCurrency()).isEqualTo("IDR");
    }

    @Test
    @DisplayName("coupon discount is computed on the quantity-adjusted subtotal")
    void couponOnSubtotal() {
      PricingRequest request = new PricingRequest();
      request.setBasePrice(new BigDecimal("50000"));
      request.setQuantity(3);
      request.setCouponCode("SAVE10");

      PricingResponse response = pricingService.calculatePrice(request);

      // subtotal = 150000; tax = 15000; discount = 10% of 150000 = 15000
      assertThat(response.getTax()).isEqualByComparingTo("15000.00");
      assertThat(response.getDiscount()).isEqualByComparingTo("15000.00");
      assertThat(response.getTotalPrice()).isEqualByComparingTo("150000.00");
    }

    @Test
    @DisplayName("null basePrice defaults to zero")
    void nullBasePriceDefaultsToZero() {
      PricingRequest request = new PricingRequest();
      request.setBasePrice(null);
      request.setQuantity(2);

      PricingResponse response = pricingService.calculatePrice(request);

      assertThat(response.getBasePrice()).isEqualByComparingTo("0");
      assertThat(response.getTax()).isEqualByComparingTo("0.00");
      assertThat(response.getTotalPrice()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("null quantity defaults to 1")
    void nullQuantityDefaultsToOne() {
      PricingRequest request = new PricingRequest();
      request.setBasePrice(new BigDecimal("100000"));
      request.setQuantity(null);

      PricingResponse response = pricingService.calculatePrice(request);

      // subtotal = 100000 * 1
      assertThat(response.getTax()).isEqualByComparingTo("10000.00");
      assertThat(response.getTotalPrice()).isEqualByComparingTo("110000.00");
    }

    @Test
    @DisplayName("null currency defaults to IDR")
    void nullCurrencyDefaultsToIdr() {
      PricingRequest request = new PricingRequest();
      request.setBasePrice(new BigDecimal("100000"));

      PricingResponse response = pricingService.calculatePrice(request);

      assertThat(response.getCurrency()).isEqualTo("IDR");
    }

    @Test
    @DisplayName("custom tax rate from request overrides the default 10%")
    void customTaxRate() {
      PricingRequest request = new PricingRequest();
      request.setBasePrice(new BigDecimal("100000"));
      request.setQuantity(1);
      request.setTaxRate(0.05);

      PricingResponse response = pricingService.calculatePrice(request);

      // tax = 100000 * 0.05 = 5000.00
      assertThat(response.getTax()).isEqualByComparingTo("5000.00");
      assertThat(response.getTotalPrice()).isEqualByComparingTo("105000.00");
    }

    @Test
    @DisplayName("invalid coupon in request throws IllegalArgumentException")
    void invalidCouponInRequest() {
      PricingRequest request = new PricingRequest();
      request.setBasePrice(new BigDecimal("100000"));
      request.setCouponCode("NOPE");

      assertThatThrownBy(() -> pricingService.calculatePrice(request))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessageContaining("NOPE");
    }
  }
}
