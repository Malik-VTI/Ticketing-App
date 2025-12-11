# API Gateway Service

API Gateway / BFF (Backend for Frontend) service for the Ticketing Application microservices architecture.

## Features

- **Request Routing**: Routes requests to appropriate microservices
- **JWT Authentication**: Validates JWT tokens and forwards user context
- **Request Aggregation**: Combines responses from multiple services
- **Rate Limiting**: Protects services from excessive requests
- **CORS Configuration**: Handles cross-origin requests
- **Error Handling**: Centralized error handling and formatting
- **Service Discovery**: Configurable service endpoints

## Prerequisites

- Node.js 16+ 
- npm or yarn
- All microservices running and accessible

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure `.env` file exists in project root with configuration (see `CONFIGURATION.md`)

3. Start the service:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Configuration

The API Gateway reads configuration from the root `.env` file. Key variables:

```env
# API Gateway
API_GATEWAY_PORT=3000
API_GATEWAY_HOST=0.0.0.0

# JWT (must match authentication service)
JWT_SECRET_KEY=your-secret-key-change-in-production

# Service URLs (optional, defaults to localhost with standard ports)
AUTH_SERVICE_URL=http://localhost:8080
BOOKING_SERVICE_URL=http://localhost:8081
PAYMENT_SERVICE_URL=http://localhost:8082
PRICING_SERVICE_URL=http://localhost:8086
# ... etc
```

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/search/flights` - Search flights (optional auth)
- `GET /api/search/trains` - Search trains (optional auth)
- `GET /api/search/hotels` - Search hotels (optional auth)

### Protected Endpoints (Require JWT Token)

- `GET /api/auth/profile` - Get user profile
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings/:id/cancel` - Cancel booking
- `POST /api/payments` - Create payment
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/refund` - Process refund

## Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

The gateway validates the token and forwards user information to microservices via headers:
- `X-User-Id`: User ID
- `X-User-Email`: User email

## Rate Limiting

Rate limiting is applied to all `/api/*` endpoints:
- **Window**: 15 minutes
- **Max requests**: 100 per IP address
- **Response**: 429 Too Many Requests when exceeded

## Project Structure

```
api-gateaway/
├── config/
│   └── config.js          # Configuration management
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   └── errorHandler.js    # Error handling middleware
├── routes/
│   ├── index.js           # Route aggregator
│   ├── auth.js            # Authentication routes
│   ├── search.js          # Search routes
│   ├── booking.js         # Booking routes
│   └── payment.js         # Payment routes
├── utils/
│   └── httpClient.js      # HTTP client utilities
├── server.js              # Express server setup
├── package.json
└── README.md
```

## Request Flow

1. **Client Request** → API Gateway
2. **Authentication** → Validate JWT (if protected route)
3. **Rate Limiting** → Check request limits
4. **Routing** → Forward to appropriate microservice
5. **Response** → Return service response to client

## Error Handling

The gateway handles errors consistently:

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

Common error codes:
- `unauthorized` - Missing or invalid token
- `token_expired` - JWT token has expired
- `service_unavailable` - Microservice is not responding
- `too_many_requests` - Rate limit exceeded
- `not_found` - Route not found
- `internal_error` - Server error

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` for auto-reload on file changes.

### Adding New Routes

1. Create route file in `routes/` directory
2. Import and use in `routes/index.js`
3. Configure service URL in `config/config.js`

Example:
```javascript
// routes/example.js
const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const { authenticate } = require('../middleware/auth');
const config = require('../config/config');

const exampleClient = createServiceClient(config.services.example.baseUrl);

router.get('/example', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(exampleClient, 'GET', '/example', {
      userId: req.user.id,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;
```

## Testing

Test the gateway health endpoint:

```bash
curl http://localhost:3000/api/health
```

Test authentication:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use token for protected endpoint
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

## Production Considerations

1. **HTTPS**: Use HTTPS in production
2. **JWT Secret**: Use strong, unique JWT secret
3. **Rate Limits**: Adjust rate limits based on traffic
4. **Service Discovery**: Consider using service discovery (Consul, Eureka, etc.)
5. **Load Balancing**: Use load balancer for high availability
6. **Monitoring**: Add logging and monitoring (e.g., Prometheus, Grafana)
7. **Caching**: Consider adding response caching for search endpoints
8. **Circuit Breaker**: Implement circuit breaker pattern for resilience

## Troubleshooting

### Service Unavailable Errors

- Check that microservices are running
- Verify service URLs in configuration
- Check network connectivity

### Authentication Errors

- Verify JWT_SECRET_KEY matches authentication service
- Check token expiration
- Ensure Authorization header format is correct

### CORS Errors

- Update CORS_ORIGIN in configuration
- Check frontend origin matches CORS settings

