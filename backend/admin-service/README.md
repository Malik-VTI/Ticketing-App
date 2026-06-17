# Admin Service

Admin dashboard microservice built with Java and Spring Boot for the Ticketing Application. Exposes aggregate platform metrics (users, bookings, revenue, and catalog counts) for the admin dashboard. Authentication/authorization is expected to be handled upstream by the API Gateway's JWT check.

## Tech Stack

- Java 17
- Spring Boot 3.2.0 (Web, Data JPA, Security)
- PostgreSQL (via `org.postgresql` driver)
- Spring `JdbcTemplate` (raw SQL for metric aggregation)
- Lombok
- Logback with logstash JSON encoder

## API Endpoints

All endpoints are under the `/api/admin` base path.

### Metrics

- `GET /api/admin/metrics` - Return aggregated dashboard metrics
  - Optional header: `X-User-Id: <uuid>` (forwarded by the API Gateway; the service does not currently enforce an admin-role check — it assumes the gateway has already validated the request)
  - Response (`MetricsResponse`):
  ```json
  {
    "totalUsers": 0,
    "totalBookings": 0,
    "totalRevenue": 0,
    "totalFlights": 0,
    "totalTrains": 0,
    "totalHotels": 0
  }
  ```

### Health Check

- `GET /api/admin/health` - Service health check (returns `{"status": "UP"}`)

## How Metrics Are Aggregated

Metrics are computed by running `COUNT`/`SUM` queries directly against the shared PostgreSQL database using `JdbcTemplate` (not by calling other microservices over REST):

- `totalUsers` - `COUNT(*)` from `users`
- `totalBookings` - `COUNT(*)` from `bookings`
- `totalRevenue` - `SUM(total_amount)` from `bookings` where `status != 'cancelled'`
- `totalFlights` - `COUNT(*)` from `flight_schedules` (falls back to `flight_schedule`)
- `totalTrains` - `COUNT(*)` from `train_schedules` (falls back to `train_schedule`)
- `totalHotels` - `COUNT(*)` from `hotels` (falls back to `hotel`)

Each query is wrapped defensively: if a table is missing or a query fails, that metric defaults to `0` instead of failing the whole request.

## Configuration

Configuration is read from `src/main/resources/application.yaml`, with the following environment variables (defaults shown):

```env
DB_SERVER=10.100.33.184
DB_PORT=5432
DB_DATABASE=ticketing_app
DB_USER=postgres
DB_PASSWORD=P@ssw0rd
ADMIN_SERVICE_PORT=8088
```

Logging levels (from `application.yaml`):

```yaml
logging:
  level:
    org.springframework.web: INFO
    com.admin_service: DEBUG
```

`SecurityConfig` disables CSRF and permits all requests at the service level, relying on the API Gateway for authentication.

## Running

### Locally

```bash
./mvnw spring-boot:run
```

Service runs on port 8088 by default.

### Build a jar

```bash
./mvnw clean package
java -jar target/admin-service-0.0.1-SNAPSHOT.jar
```

### Docker

```bash
docker build -t admin-service .
docker run -p 8088:8088 admin-service
```

Or via the root `docker-compose.yml`:

```bash
docker-compose up admin-service
```

## Project Structure

```
admin-service/
├── src/main/java/com/admin_service/
│   ├── AdminServiceApplication.java     # Application entry point
│   ├── controller/AdminController.java  # /api/admin endpoints
│   ├── service/AdminService.java        # Metric aggregation via JdbcTemplate
│   ├── dto/MetricsResponse.java         # Dashboard metrics DTO
│   └── config/SecurityConfig.java       # Security configuration
├── src/main/resources/
│   ├── application.yaml
│   └── logback-spring.xml
├── Dockerfile
├── pom.xml
└── README.md
```

## Notes

- This service reads from the shared platform database; it depends on the schemas of other services (`users`, `bookings`, flight/train/hotel catalog tables) rather than calling them over HTTP.
- An admin-role check is intentionally not implemented at this service; the architecture assumes the API Gateway validates the JWT and that only valid requests reach this endpoint.
