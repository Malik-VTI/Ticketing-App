# Payment Service

Payment microservice built with Go and the Gin framework for the Ticketing Application. It records payments for bookings, simulates a payment gateway, and confirms the related booking on success via a service-to-service call.

## Features

- Create a payment for a booking (with a simulated gateway)
- Retrieve a payment by ID
- Refund a succeeded payment (owner only)
- Automatic booking confirmation on successful payment (internal call to the booking service, with retry/backoff)
- JWT-based authentication
- PostgreSQL database integration

## API Endpoints

### Health Checks

- `GET /health` - Liveness check (shallow, does not touch the DB)
- `GET /health/ready` - Readiness check (pings the database)

### Protected Endpoints

All require `Authorization: Bearer <access_token>`.

- `POST /payments` - Create (and process) a payment
  ```json
  {
    "booking_id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 750000,
    "currency": "IDR",
    "payment_method": "bank_transfer"
  }
  ```
  - `currency` is optional (defaults to `IDR`)
  - `payment_method` must be one of `bank_transfer`, `ewallet`, `credit_card`
  - Returns the created payment with its resulting status (`succeeded` / `failed`)
- `GET /payments/:id` - Get a payment by ID
- `POST /payments/:id/refund` - Refund a payment (owner only; only `succeeded` payments can be refunded)

## Configuration

Configuration is read from environment variables (a shared `.env` is loaded from the project root if present, otherwise from the working directory).

```env
# Server
PAYMENT_SERVICE_PORT=8089   # falls back to SERVER_PORT, default 8089
PAYMENT_SERVICE_HOST=0.0.0.0 # falls back to SERVER_HOST, default 0.0.0.0

# Database (PostgreSQL)
DB_SERVER=localhost
DB_DATABASE=ticketing_app
DB_USER=postgres
DB_PASSWORD=P@ssw0rd
DB_PORT=5432

# Auth
JWT_SECRET_KEY=your-secret-key-change-in-production   # required
INTERNAL_API_KEY=shared-internal-secret               # required to confirm bookings

# Downstream
BOOKING_SERVICE_URL=http://localhost:8081   # default local fallback

# Logging & CORS
LOG_LEVEL=info                              # debug | info | warn | error
CORS_ALLOWED_ORIGIN=http://ticketing-app.local
```

> `JWT_SECRET_KEY` is mandatory: the auth middleware logs `FATAL` and exits if it is missing. `INTERNAL_API_KEY` must be set for the service to confirm bookings on the booking service; if it is missing, payment still succeeds but the confirm step is skipped (and logged as an error).

## Prerequisites

- Go 1.24 or later
- PostgreSQL (with the `payments` table present)
- Environment variables configured

## Running the Service

### Locally

```bash
go mod download
go run main.go
```

### With Docker / docker-compose

```bash
# From the project root
docker compose up payment-service
```

## Project Structure

```
payment-service/
├── config/          # Configuration management
├── database/        # Database connection
├── handlers/        # HTTP request handlers
├── middleware/      # JWT auth middleware
├── models/          # Data models, DTOs, status/method enums
├── repository/      # Data access layer
├── service/         # Business logic (gateway simulation + booking confirmation)
├── routes/          # Route definitions
├── main.go          # Application entry point
├── Dockerfile
├── go.mod
└── README.md        # This file
```

## Notes

### Simulated Gateway

`processPayment` in `service/payment_service.go` simulates a payment gateway: any payment with `amount > 0` is marked `succeeded`, and a non-positive amount is marked `failed`. The provider response is a synthetic JSON blob. To go to production, replace the body of `processPayment` with a real gateway SDK call (e.g. Midtrans / Xendit).

### Booking Confirmation

When a payment succeeds, the service asynchronously calls the booking service's internal confirm endpoint:

```
POST {BOOKING_SERVICE_URL}/bookings/{bookingId}/confirm
X-Internal-API-Key: <INTERNAL_API_KEY>
```

The call is idempotent and retried up to 3 times with backoff (0ms / 500ms / 1s) on connection failures and retryable HTTP statuses (5xx, 408, 429). Other 4xx responses are treated as terminal. Failures are logged but do not roll back the payment.

### Payment Statuses

`initiated` → `succeeded` / `failed`. A `succeeded` payment may later become `refunded`.
