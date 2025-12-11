package com.pricing_service.client;

import com.pricing_service.config.RestClientConfig;
import com.pricing_service.dto.PaginatedResponse;
import com.pricing_service.dto.StationDTO;
import com.pricing_service.dto.TrainSearchRequest;
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
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrainServiceClient {

    private final RestTemplate restTemplate;
    private final RestClientConfig config;

    public List<Object> searchTrains(TrainSearchRequest request) {
        try {
            // First, resolve station names to UUIDs
            UUID originId = resolveStationNameToId(request.getFrom());
            UUID destinationId = resolveStationNameToId(request.getTo());

            if (originId == null || destinationId == null) {
                throw new IllegalArgumentException("Could not resolve station names to IDs");
            }

            // Call the actual train service endpoint
            String url = UriComponentsBuilder.fromUri(URI.create(config.getTrainServiceUrl() + "/trains/schedules"))
                    .queryParam("origin", originId)
                    .queryParam("destination", destinationId)
                    .queryParam("date", request.getDate())
                    .toUriString();

            var response = restTemplate.exchange(url, HttpMethod.GET, null, new ParameterizedTypeReference<List<Object>>() {});
            return response.getBody();
        } catch (RestClientException e) {
            log.error("Error calling train service: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to search trains: " + e.getMessage(), e);
        }
    }

    private UUID resolveStationNameToId(String name) {
        try {
            // Fetch all stations from admin endpoint
            String url = UriComponentsBuilder.fromUri(URI.create(config.getTrainServiceUrl() + "/admin/trains/stations"))
                    .queryParam("page", 0)
                    .queryParam("size", 1000)
                    .queryParam("sortBy", "name")
                    .queryParam("direction", "ASC")
                    .toUriString();

            var response = restTemplate.exchange(url, HttpMethod.GET, null, 
                    new ParameterizedTypeReference<PaginatedResponse<StationDTO>>() {});
            
            PaginatedResponse<StationDTO> stationsResponse = response.getBody();
            if (stationsResponse == null || stationsResponse.getContent() == null) {
                return null;
            }

            String lowerName = name.toLowerCase().trim();
            return stationsResponse.getContent().stream()
                    .filter(station -> {
                        String stationName = station.getName() != null ? station.getName().toLowerCase() : "";
                        String stationCity = station.getCity() != null ? station.getCity().toLowerCase() : "";
                        String stationCode = station.getCode() != null ? station.getCode().toLowerCase() : "";
                        return stationName.equals(lowerName) ||
                               stationCity.equals(lowerName) ||
                               stationCode.equals(lowerName) ||
                               (stationName + " (" + stationCity + ")").equals(lowerName);
                    })
                    .map(StationDTO::getId)
                    .findFirst()
                    .orElse(null);
        } catch (RestClientException e) {
            log.error("Error resolving station name '{}' to ID: {}", name, e.getMessage());
            return null;
        }
    }
}
