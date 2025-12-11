# Train Service

Train microservice built with Java Spring Boot for managing train data, schedules, coaches, and seats.

## Features

- Train management (stations, trains, schedules)
- Coach and seat inventory management
- RESTful API endpoints
- MSSQL database integration
- Pagination and sorting
- Validation and error handling

## API Endpoints

### Public Endpoints

- `GET /trains/health` - Health check
- `GET /trains/schedules?origin={originId}&destination={destinationId}&date={date}` - Get train schedules by route and date
- `GET /trains/schedules?page={page}&size={size}&sortBy={field}&direction={ASC|DESC}` - Get paginated train schedules
- `GET /trains/schedules/{id}` - Get train schedule by ID
- `GET /trains/schedules/{id}/seats` - Get all seats for a schedule
- `GET /trains/schedules/{id}/seats/available` - Get available seats for a schedule

### Admin Endpoints (CRUD Operations)

#### Stations
- `GET /admin/trains/stations` - Get all stations (paginated, sortable)
- `GET /admin/trains/stations/{id}` - Get station by ID
- `POST /admin/trains/stations` - Create new station
- `PUT /admin/trains/stations/{id}` - Update station
- `DELETE /admin/trains/stations/{id}` - Delete station

#### Trains
- `GET /admin/trains/trains` - Get all trains (paginated, sortable)
- `GET /admin/trains/trains/{id}` - Get train by ID
- `POST /admin/trains/trains` - Create new train
- `PUT /admin/trains/trains/{id}` - Update train
- `DELETE /admin/trains/trains/{id}` - Delete train

#### Train Schedules
- `GET /admin/trains/schedules` - Get all schedules (paginated, sortable)
- `GET /admin/trains/schedules/{id}` - Get schedule by ID
- `POST /admin/trains/schedules` - Create new schedule
- `PUT /admin/trains/schedules/{id}` - Update schedule
- `DELETE /admin/trains/schedules/{id}` - Delete schedule

#### Coaches
- `GET /admin/trains/coaches` - Get all coaches (paginated, sortable)
- `GET /admin/trains/coaches/{id}` - Get coach by ID
- `POST /admin/trains/coaches` - Create new coach
- `PUT /admin/trains/coaches/{id}` - Update coach
- `DELETE /admin/trains/coaches/{id}` - Delete coach

#### Coach Seats
- `GET /admin/trains/seats` - Get all seats (paginated, sortable)
- `GET /admin/trains/seats/{id}` - Get seat by ID
- `POST /admin/trains/seats` - Create new seat
- `PUT /admin/trains/seats/{id}` - Update seat
- `DELETE /admin/trains/seats/{id}` - Delete seat

## Configuration

The service reads configuration from environment variables (shared `.env` file):

```env
DB_SERVER=10.100.33.68
DB_DATABASE=ticketing_app
DB_USER=lek
DB_PASSWORD=P@ssw0rd
DB_PORT=1433
TRAIN_SERVICE_PORT=8084
```

## Database Schema

The service uses the following tables:
- `stations` - Train station information
- `trains` - Train information
- `train_schedules` - Train schedules
- `coaches` - Coach information
- `coach_seats` - Seat inventory

## Running the Service

1. Ensure database migrations are run (see `database/migrations/V003__create_train_schema.sql`)

2. Run the service:
   ```bash
   mvn spring-boot:run
   ```

   Or build and run:
   ```bash
   mvn clean package
   java -jar target/train-service-0.0.1-SNAPSHOT.jar
   ```

## Project Structure

```
train-service/
├── src/main/java/com/train_service/
│   ├── entity/          # JPA entities
│   ├── repository/       # Data access layer
│   ├── service/          # Business logic
│   ├── controller/       # REST controllers
│   ├── dto/              # Data transfer objects
│   ├── exception/        # Exception handling
│   └── config/           # Configuration classes
└── src/main/resources/
    └── application.yaml  # Application configuration
```

## Dependencies

- Spring Boot 4.0.0
- Spring Data JPA
- MSSQL JDBC Driver
- Lombok
- Spring Validation

