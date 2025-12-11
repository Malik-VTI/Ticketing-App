package com.pricing_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestClientConfig {

    @Value("${services.flight.url}")
    private String flightServiceUrl;

    @Value("${services.train.url}")
    private String trainServiceUrl;

    @Value("${services.hotel.url}")
    private String hotelServiceUrl;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    public String getFlightServiceUrl() {
        return flightServiceUrl;
    }

    public String getTrainServiceUrl() {
        return trainServiceUrl;
    }

    public String getHotelServiceUrl() {
        return hotelServiceUrl;
    }
}
