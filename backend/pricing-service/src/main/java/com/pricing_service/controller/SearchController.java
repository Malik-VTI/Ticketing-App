package com.pricing_service.controller;

import com.pricing_service.dto.*;
import com.pricing_service.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/flights")
    public ResponseEntity<SearchResponse<Object>> searchFlights(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam String date,
            @RequestParam(required = false, defaultValue = "1") Integer adults,
            @RequestParam(required = false, defaultValue = "0") Integer children) {
        FlightSearchRequest request = new FlightSearchRequest();
        request.setFrom(from);
        request.setTo(to);
        request.setDate(date);
        request.setAdults(adults);
        request.setChildren(children);
        return ResponseEntity.ok(searchService.searchFlights(request));
    }

    @GetMapping("/trains")
    public ResponseEntity<SearchResponse<Object>> searchTrains(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam String date) {
        TrainSearchRequest request = new TrainSearchRequest();
        request.setFrom(from);
        request.setTo(to);
        request.setDate(date);
        return ResponseEntity.ok(searchService.searchTrains(request));
    }

    @GetMapping("/hotels")
    public ResponseEntity<SearchResponse<Object>> searchHotels(
            @RequestParam String city,
            @RequestParam String checkin,
            @RequestParam String checkout,
            @RequestParam(required = false, defaultValue = "1") Integer guests) {
        HotelSearchRequest request = new HotelSearchRequest();
        request.setCity(city);
        request.setCheckin(checkin);
        request.setCheckout(checkout);
        request.setGuests(guests);
        return ResponseEntity.ok(searchService.searchHotels(request));
    }
}
