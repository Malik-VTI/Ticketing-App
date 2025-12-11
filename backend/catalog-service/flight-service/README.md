# Flight Service

Flight microservice built with Java Spring Boot for managing flight data, schedules, seats, and fares.

## Features

- Flight management (airlines, airports, flights)
- Flight schedule management
- Seat inventory management
- Fare management
- RESTful API endpoints
- MSSQL database integration

## API Endpoints

### Public Endpoints

- `GET /flights/health` - Health check
- `GET /flights/schedules?origin={originId}&destination={destinationId}&date={date}` - Get flight schedules by route and date
- `GET /flights/schedules?page={page}&size={size}&sortBy={field}&direction={ASC|DESC}` - Get paginated flight schedules
- `GET /flights/schedules/{id}` - Get flight schedule by ID
- `GET /flights/schedules/{id}/seats` - Get all seats for a schedule
- `GET /flights/schedules/{id}/seats/available` - Get available seats for a schedule

### Admin Endpoints (CRUD Operations)

#### Airlines
- `GET /admin/flights/airlines` - Get all airlines (paginated, sortable, filterable)
- `GET /admin/flights/airlines/{id}` - Get airline by ID
- `POST /admin/flights/airlines` - Create new airline
- `PUT /admin/flights/airlines/{id}` - Update airline
- `DELETE /admin/flights/airlines/{id}` - Delete airline

#### Airports
- `GET /admin/flights/airports` - Get all airports (paginated, sortable, filterable)
- `GET /admin/flights/airports/{id}` - Get airport by ID
- `POST /admin/flights/airports` - Create new airport
- `PUT /admin/flights/airports/{id}` - Update airport
- `DELETE /admin/flights/airports/{id}` - Delete airport

#### Flights
- `GET /admin/flights/flights` - Get all flights (paginated, sortable, filterable)
- `GET /admin/flights/flights/{id}` - Get flight by ID
- `POST /admin/flights/flights` - Create new flight
- `PUT /admin/flights/flights/{id}` - Update flight
- `DELETE /admin/flights/flights/{id}` - Delete flight

#### Flight Schedules
- `GET /admin/flights/schedules` - Get all schedules (paginated, sortable, filterable)
- `GET /admin/flights/schedules/{id}` - Get schedule by ID
- `POST /admin/flights/schedules` - Create new schedule
- `PUT /admin/flights/schedules/{id}` - Update schedule
- `DELETE /admin/flights/schedules/{id}` - Delete schedule

#### Flight Seats
- `GET /admin/flights/seats` - Get all seats (paginated, sortable, filterable)
- `GET /admin/flights/seats/{id}` - Get seat by ID
- `POST /admin/flights/seats` - Create new seat
- `PUT /admin/flights/seats/{id}` - Update seat
- `DELETE /admin/flights/seats/{id}` - Delete seat

#### Flight Fares
- `GET /admin/flights/fares` - Get all fares (paginated, sortable, filterable)
- `GET /admin/flights/fares/{id}` - Get fare by ID
- `POST /admin/flights/fares` - Create new fare
- `PUT /admin/flights/fares/{id}` - Update fare
- `DELETE /admin/flights/fares/{id}` - Delete fare

## Configuration

The service reads configuration from environment variables (shared `.env` file):

```env
DB_SERVER=10.100.33.68
DB_DATABASE=ticketing_app
DB_USER=lek
DB_PASSWORD=P@ssw0rd
DB_PORT=1433
FLIGHT_SERVICE_PORT=8083
```

## Database Schema

The service uses the following tables:
- `airlines` - Airline information
- `airports` - Airport information
- `flights` - Flight routes
- `flight_schedules` - Flight schedules
- `flight_seats` - Seat inventory
- `flight_fares` - Fare information

## Running the Service

1. Ensure database migrations are run (see `database/migrations/V002__create_flight_schema.sql`)

2. Run the service:
   ```bash
   mvn spring-boot:run
   ```

   Or build and run:
   ```bash
   mvn clean package
   java -jar target/flight-service-0.0.1-SNAPSHOT.jar
   ```

## Project Structure

```
flight-service/
├── src/main/java/com/flight_service/
│   ├── entity/          # JPA entities
│   ├── repository/      # Data access layer
│   ├── service/          # Business logic
│   ├── controller/      # REST controllers
│   ├── dto/             # Data transfer objects
│   └── config/          # Configuration classes
└── src/main/resources/
    └── application.yaml # Application configuration
```

## Dependencies

- Spring Boot 4.0.0
- Spring Data JPA
- MSSQL JDBC Driver
- Lombok
- Spring Validation

## Features Implemented

✅ **Admin Endpoints** - Complete CRUD operations for all entities
✅ **Validation** - Request validation using Jakarta Validation
✅ **Error Handling** - Global exception handler with proper error responses
✅ **Pagination** - All list endpoints support pagination
✅ **Sorting** - All list endpoints support sorting by any field
✅ **Filtering** - Search capabilities for schedules by route and date

## Pagination & Sorting

All list endpoints support pagination and sorting:

- `page` - Page number (default: 0)
- `size` - Page size (default: 20)
- `sortBy` - Field to sort by (default varies by endpoint)
- `direction` - Sort direction: ASC or DESC (default: ASC)

Example:
```
GET /admin/flights/airlines?page=0&size=10&sortBy=name&direction=ASC
```

## Error Handling

The service uses a global exception handler that returns consistent error responses:

```json
{
  "error": "ERROR_CODE",
  "message": "Error message",
  "timestamp": "2024-01-01T12:00:00",
  "validationErrors": {
    "field": "validation message"
  }
}
```

Error codes:
- `RESOURCE_NOT_FOUND` - Resource not found (404)
- `VALIDATION_ERROR` - Validation failed (400)
- `INVALID_ARGUMENT` - Invalid argument (400)
- `INTERNAL_ERROR` - Internal server error (500)

