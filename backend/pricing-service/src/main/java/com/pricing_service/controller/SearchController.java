package com.pricing_service.controller;

import com.pricing_service.dto.*;
import com.pricing_service.service.SearchService;
import com.pricing_service.logging.LogEvents;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private static final Logger log = LoggerFactory.getLogger(SearchController.class);

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
        SearchResponse<Object> response = searchService.searchFlights(request);
        logSearch("flight", response, "search.origin", from, "search.destination", to, "search.date", date,
                "search.adults", adults, "search.children", children);
        return ResponseEntity.ok(response);
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
        SearchResponse<Object> response = searchService.searchTrains(request);
        logSearch("train", response, "search.origin", from, "search.destination", to, "search.date", date);
        return ResponseEntity.ok(response);
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
        SearchResponse<Object> response = searchService.searchHotels(request);
        logSearch("hotel", response, "search.city", city, "search.checkin", checkin, "search.checkout", checkout,
                "search.guests", guests);
        return ResponseEntity.ok(response);
    }

    private static void logSearch(String product, SearchResponse<Object> response, Object... criteria) {
        var fields = LogEvents.fields(criteria);
        fields.put("search.product", product);
        fields.put("search.result_count", response == null ? 0 : response.getTotalCount());
        fields.put("search.cached", response != null && response.isCached());
        LogEvents.business(log, "search.executed", product + " search executed", fields);
    }
}
