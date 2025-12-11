# Pricing Service

Search & Pricing Service for the Ticketing Application. Handles search aggregation and pricing calculations with Redis caching.

## Features

- **Search Endpoints**: Aggregates search results from Flight, Train, and Hotel services
- **Pricing Calculation**: Calculates final prices with taxes and discounts
- **Redis Caching**: Caches search results with 300s TTL
- **Service Integration**: Communicates with catalog services via REST

## Endpoints

### Search

- `GET /api/search/flights?from={origin}&to={destination}&date={date}&adults={count}&children={count}`
- `GET /api/search/trains?from={origin}&to={destination}&date={date}`
- `GET /api/search/hotels?city={city}&checkin={date}&checkout={date}&guests={count}`

### Pricing

- `GET /api/pricing/calculate?basePrice={amount}&couponCode={code}`

## Configuration

Set environment variables:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
FLIGHT_SERVICE_URL=http://localhost:8081
TRAIN_SERVICE_URL=http://localhost:8082
HOTEL_SERVICE_URL=http://localhost:8084
```

## Running

```bash
./mvnw spring-boot:run
```

Service runs on port 8083.

## Dependencies

- Spring Boot Web
- Spring Data Redis
- Lombok
- Validation
