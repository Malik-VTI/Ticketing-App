package com.pricing_service.service;

import com.pricing_service.client.FlightServiceClient;
import com.pricing_service.client.HotelServiceClient;
import com.pricing_service.client.TrainServiceClient;
import com.pricing_service.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final FlightServiceClient flightServiceClient;
    private final TrainServiceClient trainServiceClient;
    private final HotelServiceClient hotelServiceClient;

    public SearchResponse<Object> searchFlights(FlightSearchRequest request) {
        var results = flightServiceClient.searchFlights(request);
        return SearchResponse.builder()
                .results(results)
                .totalCount(results.size())
                .cached(false)
                .build();
    }

    public SearchResponse<Object> searchTrains(TrainSearchRequest request) {
        var results = trainServiceClient.searchTrains(request);
        return SearchResponse.builder()
                .results(results)
                .totalCount(results.size())
                .cached(false)
                .build();
    }

    public SearchResponse<Object> searchHotels(HotelSearchRequest request) {
        var results = hotelServiceClient.searchHotels(request);
        return SearchResponse.builder()
                .results(results)
                .totalCount(results.size())
                .cached(false)
                .build();
    }
}
