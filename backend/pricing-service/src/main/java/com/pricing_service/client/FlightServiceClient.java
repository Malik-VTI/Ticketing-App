package com.pricing_service.client;

import com.pricing_service.config.RestClientConfig;
import com.pricing_service.dto.AirportDTO;
import com.pricing_service.dto.FlightSearchRequest;
import com.pricing_service.dto.PaginatedResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class FlightServiceClient {

    private final RestTemplate restTemplate;
    private final RestClientConfig config;

    public List<Object> searchFlights(FlightSearchRequest request) {
        try {
            // First, resolve airport names to UUIDs
            UUID originId = resolveAirportNameToId(request.getFrom());
            UUID destinationId = resolveAirportNameToId(request.getTo());

            if (originId == null || destinationId == null) {
                throw new IllegalArgumentException("Could not resolve airport names to IDs");
            }

            // Call the actual flight service endpoint
            String url = UriComponentsBuilder.fromUri(URI.create(config.getFlightServiceUrl() + "/flights/schedules"))
                    .queryParam("origin", originId)
                    .queryParam("destination", destinationId)
                    .queryParam("date", request.getDate())
                    .toUriString();

            var response = restTemplate.exchange(url, HttpMethod.GET, null, new ParameterizedTypeReference<List<Object>>() {});
            return response.getBody();
        } catch (RestClientException e) {
            log.error("Error calling flight service: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to search flights: " + e.getMessage(), e);
        }
    }

    private UUID resolveAirportNameToId(String name) {
        try {
            // Fetch all airports from admin endpoint
            String url = UriComponentsBuilder.fromUri(URI.create(config.getFlightServiceUrl() + "/admin/flights/airports"))
                    .queryParam("page", 0)
                    .queryParam("size", 1000)
                    .queryParam("sortBy", "name")
                    .queryParam("direction", "ASC")
                    .toUriString();

            var response = restTemplate.exchange(url, HttpMethod.GET, null, 
                    new ParameterizedTypeReference<PaginatedResponse<AirportDTO>>() {});
            
            PaginatedResponse<AirportDTO> airportsResponse = response.getBody();
            if (airportsResponse == null || airportsResponse.getContent() == null) {
                return null;
            }

            String lowerName = name.toLowerCase().trim();
            return airportsResponse.getContent().stream()
                    .filter(airport -> {
                        String airportName = airport.getName() != null ? airport.getName().toLowerCase() : "";
                        String airportCity = airport.getCity() != null ? airport.getCity().toLowerCase() : "";
                        String airportCode = airport.getCode() != null ? airport.getCode().toLowerCase() : "";
                        return airportName.equals(lowerName) ||
                               airportCity.equals(lowerName) ||
                               airportCode.equals(lowerName) ||
                               (airportName + " (" + airportCity + ")").equals(lowerName);
                    })
                    .map(AirportDTO::getId)
                    .findFirst()
                    .orElse(null);
        } catch (RestClientException e) {
            log.error("Error resolving airport name '{}' to ID: {}", name, e.getMessage());
            return null;
        }
    }
}
