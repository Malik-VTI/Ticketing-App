package com.pricing_service.client;

import com.pricing_service.config.RestClientConfig;
import com.pricing_service.dto.HotelSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class HotelServiceClient {

    private final RestTemplate restTemplate;
    private final RestClientConfig config;

    public List<Object> searchHotels(HotelSearchRequest request) {
        try {
            // Hotel service accepts city name directly, no UUID resolution needed
            String url = UriComponentsBuilder.fromUri(URI.create(config.getHotelServiceUrl() + "/hotels"))
                    .queryParam("city", request.getCity())
                    .queryParam("checkin", request.getCheckin())
                    .queryParam("checkout", request.getCheckout())
                    .queryParam("guests", request.getGuests())
                    .queryParam("page", 0)
                    .queryParam("size", 100)
                    .toUriString();

            var response = restTemplate.exchange(url, HttpMethod.GET, null, 
                    new ParameterizedTypeReference<Object>() {});
            
            Object body = response.getBody();
            // Hotel service returns paginated response, extract content
            if (body instanceof java.util.Map) {
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> map = (java.util.Map<String, Object>) body;
                Object content = map.get("content");
                if (content instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Object> hotels = (List<Object>) content;
                    return hotels;
                }
            }
            return List.of();
        } catch (RestClientException e) {
            log.error("Error calling hotel service: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to search hotels: " + e.getMessage(), e);
        }
    }
}
