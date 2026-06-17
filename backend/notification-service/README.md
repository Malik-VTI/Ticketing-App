# Notification Service

Notification microservice built with Go and the Gin framework for the Ticketing Application. It receives notification events from other services (booking, payment) and delivers them as HTML emails over SMTP.

## Features

- Single service-to-service endpoint to send notifications
- HTML email templates for booking confirmation, payment confirmation, and booking cancellation
- SMTP delivery with STARTTLS (port 587) or implicit TLS/SSL (port 465)
- Fire-and-forget sending: the endpoint returns immediately and the email is sent asynchronously
- Optional SMTP — if SMTP credentials are not configured, the email is logged and skipped instead of failing the caller
- No database dependency

## API Endpoints

### Health Checks

- `GET /health` - Liveness check
- `GET /health/ready` - Readiness check (the service has no required external dependency, so this reports up as soon as the process is serving)

### Internal Endpoint

No authentication (intended for service-to-service calls on the internal network).

- `POST /notifications/send` - Queue and send a notification email
  ```json
  {
    "type": "booking_confirmation",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "booking_id": "123e4567-e89b-12d3-a456-426614174000",
    "reference": "BK-AB12CD34",
    "amount": 750000,
    "currency": "IDR"
  }
  ```
  - `type` must be one of `booking_confirmation`, `payment_confirmation`, `booking_cancelled`
  - `user_id` and a valid `email` are required; `name` defaults to "Valued Customer" if empty
  - `booking_id`, `reference`, `amount`, and `currency` are optional and used to populate the templates
  - Responds `200` with `{"message": "Notification queued", ...}` immediately; actual delivery happens in the background, and failures are logged (never returned to the caller)

## Configuration

Configuration is read from environment variables (a shared `.env` is loaded from the project root if present, otherwise from the working directory).

```env
# Server
NOTIFICATION_SERVICE_PORT=8087   # default 8087
NOTIFICATION_SERVICE_HOST=0.0.0.0 # default 0.0.0.0

# SMTP (optional — if SMTP_USER/SMTP_PASS are empty, emails are logged instead of sent)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587                    # 587 = STARTTLS, 465 = implicit TLS/SSL
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@ticketing.app

# Logging & CORS
LOG_LEVEL=info                   # debug | info | warn | error
CORS_ALLOWED_ORIGIN=http://ticketing-app.local
```

> The service does not require a database. (The `docker-compose.yml` definition passes `DB_*` variables for consistency with the other services, but they are not used by this service.)

## Prerequisites

- Go 1.24 or later
- Optional: SMTP credentials (without them the service still runs and logs the emails it would have sent)
- Environment variables configured

## Running the Service

### Locally

```bash
go mod download
go run cmd/api/main.go
```

### With Docker / docker-compose

```bash
# From the project root
docker compose up notification-service
```

## Project Structure

```
notification-service/
├── cmd/
│   └── api/
│       └── main.go          # Application entry point (routing, server, CORS)
├── internal/
│   ├── handlers/            # HTTP handlers (Send, Health, Ready)
│   ├── models/              # Request/response models, notification types
│   └── service/             # Email service (SMTP) + HTML templates
├── Dockerfile
├── go.mod
└── README.md                # This file
```

## Notes

### Optional SMTP

If `SMTP_USER` or `SMTP_PASS` is empty, `EmailService.Send` logs the subject and a body preview and returns successfully without contacting an SMTP server. This makes local development possible without real mail credentials. When both are set, the service connects to `SMTP_HOST:SMTP_PORT` and sends a `text/html` message — using implicit TLS when the port is `465`, otherwise upgrading the connection via `STARTTLS`.

### Email Templates

Three inline HTML templates live in `internal/service/email_service.go`:

- `booking_confirmation` — "Booking Confirmed" (uses `Reference`)
- `payment_confirmation` — "Payment Received" (uses `Reference`, and `Amount`/`Currency` if present)
- `booking_cancelled` — "Booking Cancelled" (uses `Reference`)
