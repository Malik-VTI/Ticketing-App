# Ticketing App Implementation Plan

## Project Overview

This is a microservices-based ticketing application supporting flights, trains, and hotels. The architecture uses:

- **Frontend**: React.js + Node.js (BFF/API Gateway)
- **Backend**: Go (gin) for high-throughput services, Java (Spring Boot) for complex business logic
- **Database**: Microsoft SQL Server (MSSQL) with schema per service
- **Cache/State**: Redis for caching, distributed locks, sessions
- **Messaging**: RabbitMQ/Kafka for event-driven communication

## Current State

- Project structure is scaffolded with service directories
- Java services have basic Spring Boot application classes
- Go services have `go.mod` files but no implementation
- API Gateway and Frontend directories are empty
- No database migrations or business logic implemented

## Implementation Phases

### Phase 1: Foundation & Infrastructure (Priority 1)

**1.1 Database Setup & Migrations**

- Set up MSSQL database instance (local or Docker)
- Create database schemas per service (users, flights, trains, hotels, bookings, payments)
- Implement database migrations using Flyway or Liquibase
- Create all entity tables as defined in README (users, airlines, airports, flights, flight_schedules, flight_seats, flight_fares, stations, trains, train_schedules, coaches, coach_seats, hotels, room_types, rooms, room_rates, bookings, booking_items, payments, coupons, audit_logs)
- Add indexes on frequently queried columns (booking_reference, user_id, status, dates)

**1.2 Authentication Service (Go + gin)**

- Implement user registration endpoint (`POST /auth/register`)
- Implement login endpoint (`POST /auth/login`) with JWT token generation
- Implement refresh token endpoint (`POST /auth/refresh`)
- Set up MSSQL connection and user table operations
- Implement password hashing (bcrypt)
- Add Redis integration for session management (optional)
- Add input validation and error handling

**1.3 API Gateway / BFF (Node.js)**

- Set up Express/Fastify server
- Implement routing to microservices
- Implement JWT authentication middleware
- Add request aggregation for frontend
- Implement rate limiting
- Add CORS configuration
- Set up service discovery/configuration for backend services

**1.4 Frontend Setup (React.js)**

- Initialize React application with TypeScript
- Set up routing (React Router)
- Create authentication pages (Login, Register)
- Implement JWT token storage and management
- Set up API client for BFF communication
- Create basic layout components (Header, Footer, Navigation)

### Phase 2: Core Catalog Services (Priority 2)

**2.1 Flight Service (Java Spring Boot)**

- Implement entity models (Airline, Airport, Flight, FlightSchedule, Seat, Fare)
- Create repositories for database operations
- Implement REST endpoints:
- `GET /flights` - List flights
- `GET /flights/{id}` - Get flight details
- `GET /flights/schedules` - Get flight schedules
- `GET /flights/{scheduleId}/seats` - Get seat map
- Admin endpoints for CRUD operations
- Add MSSQL integration with JPA/Hibernate
- Implement validation and error handling

**2.2 Train Service (Java Spring Boot)**

- Implement entity models (Station, Train, TrainSchedule, Coach, CoachSeat)
- Create repositories
- Implement REST endpoints:
- `GET /trains` - List trains
- `GET /trains/{id}` - Get train details
- `GET /trains/schedules` - Get train schedules
- `GET /trains/{scheduleId}/seats` - Get seat map
- Admin endpoints for CRUD operations
- Add MSSQL integration

**2.3 Hotel Service (Go + gin)**

- Implement entity models (Hotel, RoomType, Room, Rate)
- Create database layer with SQL queries
- Implement REST endpoints:
- `GET /hotels` - List hotels
- `GET /hotels/{id}` - Get hotel details
- `GET /hotels/{id}/rooms` - Get available rooms
- `GET /hotels/{id}/rates` - Get room rates
- Admin endpoints for CRUD operations
- Add MSSQL integration

### Phase 3: Search & Pricing Service (Priority 3)

**3.1 Search & Pricing Service (Java Spring Boot)**

- Implement search endpoints:
- `GET /search/flights?from=&to=&date=&adults=&children=`
- `GET /search/trains?from=&to=&date=`
- `GET /search/hotels?city=&checkin=&checkout=&guests=`
- Integrate with Flight, Train, and Hotel services
- Implement Redis caching for search results (TTL 60-300s)
- Implement pricing calculation logic:
- Base price retrieval
- Tax calculation
- Promo/coupon application
- Fare rules application
- Add search result aggregation and ranking

### Phase 4: Booking & Payment Services (Priority 4)

**4.1 Booking Service (Go + gin)**

- Implement entity models (Booking, BookingItem)
- Implement distributed locking with Redis for seat/room reservation
- Implement booking endpoints:
- `POST /bookings` - Create booking (with inventory lock)
- `GET /bookings/{id}` - Get booking details
- `POST /bookings/{id}/cancel` - Cancel booking
- Implement booking state machine (pending → confirmed → cancelled)
- Integrate with Payment Service
- Publish domain events (`booking.created`, `booking.confirmed`, `booking.cancelled`) to message broker
- Implement timeout mechanism for pending bookings (release lock after X minutes)

**4.2 Payment Service (Go + gin)**

- Implement entity models (PaymentTransaction)
- Implement payment endpoints:
- `POST /payments` - Initiate payment
- `GET /payments/{id}` - Get payment status
- `POST /payments/{id}/refund` - Process refund
- Integrate with payment gateway (mock or real provider)
- Implement payment state machine (initiated → succeeded/failed → refunded)
- Publish domain events (`payment.succeeded`, `payment.failed`)
- Store payment provider responses

### Phase 5: Supporting Services (Priority 5)

**5.1 Profile Service (Java Spring Boot)**

- Implement user profile endpoints
- Implement loyalty points management
- Add user preferences storage
- Integrate with Auth Service for user data

**5.2 Notification Service (Java/Go)**

- Implement notification endpoint (`POST /notifications/send`)
- Add email sending capability (SMTP or service like SendGrid)
- Add SMS sending capability (optional)
- Implement templates for booking confirmations, boarding passes, invoices
- Subscribe to domain events from Booking and Payment services

**5.3 Admin Service (Java Spring Boot)**

- Implement admin authentication and RBAC
- Create inventory management endpoints
- Create pricing management endpoints
- Create promo/coupon management endpoints
- Add audit logging for admin actions

### Phase 6: Integration & Infrastructure (Priority 6)

**6.1 Message Broker Setup**

- Set up RabbitMQ or Kafka
- Configure exchanges/queues for domain events
- Implement event publishers in services
- Implement event consumers/subscribers
- Add event schema definitions

**6.2 Redis Integration**

- Configure Redis connection in all services
- Implement caching patterns:
- Search result caching
- Session storage
- Distributed locks
- Rate limiting counters
- Add Redis health checks

**6.3 Service Communication**

- Implement service-to-service communication (HTTP clients)
- Add circuit breakers for resilience
- Implement retry mechanisms
- Add service discovery/configuration

**6.4 Frontend Development**

- Create search pages (Flight, Train, Hotel search)
- Create booking flow pages (seat selection, passenger details, payment)
- Create booking history page
- Create admin dashboard (if needed)
- Implement real-time updates for booking status

### Phase 7: Testing & Deployment (Priority 7)

**7.1 Testing**

- Write unit tests for each service
- Write integration tests for API endpoints
- Write end-to-end tests for booking flow
- Add load testing for critical paths

**7.2 Security Hardening**

- Implement HTTPS/TLS
- Add input sanitization
- Implement SQL injection prevention
- Add log masking for sensitive data
- Implement RBAC for admin endpoints

**7.3 Documentation**

- API documentation (OpenAPI/Swagger)
- Deployment documentation
- Architecture diagrams
- Runbook for operations

**7.4 Deployment Setup**

- Dockerize all services
- Create docker-compose.yml for local development
- Set up CI/CD pipelines
- Configure environment variables
- Set up monitoring and logging

## Key Files to Create/Modify

### Database

- `database/migrations/001_create_users_schema.sql`
- `database/migrations/002_create_flight_schema.sql`
- `database/migrations/003_create_train_schema.sql`
- `database/migrations/004_create_hotel_schema.sql`
- `database/migrations/005_create_booking_schema.sql`
- `database/migrations/006_create_payment_schema.sql`

### Auth Service (Go)

- `backend/authentication-service/main.go`
- `backend/authentication-service/handlers/auth_handler.go`
- `backend/authentication-service/models/user.go`
- `backend/authentication-service/database/db.go`
- `backend/authentication-service/middleware/jwt.go`

### API Gateway (Node.js)

- `api-gateaway/package.json`
- `api-gateaway/src/index.js`
- `api-gateaway/src/routes/index.js`
- `api-gateaway/src/middleware/auth.js`

### Frontend (React)

- `frontend/package.json`
- `frontend/src/App.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Search.tsx`
- `frontend/src/services/api.ts`

### Catalog Services

- Java services: Entity classes, Controllers, Services, Repositories
- Go services: handlers, models, database layer

## Recommended Starting Point

**Start with Phase 1 (Foundation)** as it's the critical path:

1. Database setup enables all services
2. Auth Service is required for user operations
3. API Gateway is the entry point for frontend
4. Basic frontend allows testing the full flow

After Phase 1, proceed with Phase 2 (Catalog Services) to have data to search and book, then Phase 3 (Search & Pricing) to enable the booking flow.