/**
 * OpenAPI 3.0 specification for the Ticketing App API Gateway (DOC-01).
 *
 * This is a hand-written spec (no fragile inline annotations). It documents the
 * real public endpoints exposed under `/api` by the gateway routes. Keep this in
 * sync with the files in `routes/` when endpoints change.
 *
 * Served as interactive docs at GET /api/docs and as raw JSON at GET /api/docs.json
 * (see server.js).
 */

const pkg = require('./package.json');

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Ticketing App API Gateway',
    version: pkg.version || '1.0.0',
    description:
      'Public REST API for the Ticketing Application. The gateway proxies requests to ' +
      'the underlying microservices (auth, booking, payment, flight, train, hotel, ' +
      'pricing, profile, admin). All endpoints are served under the `/api` prefix.\n\n' +
      'Endpoints marked with a lock require a Bearer JWT access token in the ' +
      '`Authorization` header (obtain one via `POST /api/auth/login`).\n\n' +
      'Note: most non-validation responses are passed through transparently from the ' +
      'upstream microservices, so concrete response shapes may vary. The examples below ' +
      'are representative, not exhaustive schemas.',
  },
  servers: [
    { url: '/', description: 'Same-origin (relative to the gateway host)' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Flights', description: 'Flight schedule search and lookup' },
    { name: 'Trains', description: 'Train schedule search and lookup' },
    { name: 'Hotels', description: 'Hotel search and lookup' },
    { name: 'Bookings', description: 'Booking creation, retrieval and cancellation' },
    { name: 'Payments', description: 'Payment processing and lookup' },
    { name: 'Pricing', description: 'Price calculation with taxes and discounts' },
    { name: 'Profile', description: 'Current user profile management' },
    { name: 'System', description: 'Health and service metadata' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token issued by POST /api/auth/login.',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing, malformed, expired or invalid JWT.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            examples: {
              missing: {
                value: { error: 'unauthorized', message: 'Authorization header is required' },
              },
              expired: {
                value: { error: 'token_expired', message: 'Token has expired' },
              },
              invalid: {
                value: { error: 'invalid_token', message: 'Invalid token' },
              },
            },
          },
        },
      },
      BadRequest: {
        description: 'Validation error for the supplied request parameters.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'missing_parameters', message: 'originName, destinationName, and date are required' },
          },
        },
      },
      NotFound: {
        description: 'The requested resource was not found.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'airport_not_found', message: 'One or both airports not found. Please check the names.' },
          },
        },
      },
      TooManyRequests: {
        description: 'Rate limit exceeded (100 requests / 15 min per IP across /api/*, except /api/health).',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'too_many_requests', message: 'Too many requests from this IP, please try again later.' },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'invalid_date' },
          message: { type: 'string', example: 'date must be YYYY-MM-DD' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', example: 'S3curePass!' },
          name: { type: 'string', example: 'Jane Doe' },
        },
        description: 'Body is forwarded to the auth service; fields shown are typical.',
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', format: 'password', example: 'S3curePass!' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          token_type: { type: 'string', example: 'Bearer' },
          user: { type: 'object', additionalProperties: true },
        },
        description: 'Shape is determined by the upstream auth service. A refresh token is typically set via an HttpOnly Set-Cookie header.',
      },
      BookingRequest: {
        type: 'object',
        description: 'Booking payload forwarded to the booking service. The authenticated user id is attached by the gateway.',
        additionalProperties: true,
        example: {
          type: 'FLIGHT',
          scheduleId: '5f9c1b2e-1234-4a5b-9c8d-abcdef012345',
          seatIds: ['12A', '12B'],
          passengers: [{ name: 'Jane Doe', idNumber: 'A1234567' }],
        },
      },
      PaymentRequest: {
        type: 'object',
        description: 'Payment payload forwarded to the payment service. `user_id` is overridden with the authenticated user id by the gateway.',
        additionalProperties: true,
        example: {
          booking_id: '7e1f8c0a-9999-4b2c-8d3e-112233445566',
          amount: 1500000,
          currency: 'IDR',
          method: 'CREDIT_CARD',
        },
      },
      PricingResult: {
        type: 'object',
        additionalProperties: true,
        description: 'Pricing breakdown returned by the pricing service.',
        example: {
          basePrice: 1000000,
          tax: 110000,
          discount: 50000,
          total: 1060000,
          currency: 'IDR',
        },
      },
    },
  },
  paths: {
    // ----------------------------------------------------------------- Auth
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Proxies to the auth service. May set a refresh-token cookie.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          200: {
            description: 'User registered.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { description: 'Validation error from the auth service.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and obtain an access token',
        description: 'Returns an access token and typically sets an HttpOnly refresh-token cookie.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: {
            description: 'Authenticated.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { description: 'Invalid credentials.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh the access token',
        description: 'Exchanges a refresh token (sent as an HttpOnly cookie and/or in the body) for a new access token.',
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        responses: {
          200: {
            description: 'New access token issued.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { description: 'Refresh token missing or invalid.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out',
        description: 'Clears the refresh-token cookie via the auth service.',
        responses: {
          200: { description: 'Logged out.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
        },
      },
    },
    '/api/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -------------------------------------------------------------- Flights
    '/api/flights/search': {
      get: {
        tags: ['Flights'],
        summary: 'Search flight schedules by airport names',
        description:
          'Resolves origin/destination names (matched against airport name, city or code) to ' +
          'airport ids and returns matching schedules for the given date.',
        parameters: [
          { name: 'originName', in: 'query', required: true, schema: { type: 'string', minLength: 1, maxLength: 100 }, example: 'Jakarta' },
          { name: 'destinationName', in: 'query', required: true, schema: { type: 'string', minLength: 1, maxLength: 100 }, example: 'Bali' },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, example: '2026-07-01' },
        ],
        responses: {
          200: { description: 'Matching flight schedules.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    // --------------------------------------------------------------- Trains
    '/api/trains/search': {
      get: {
        tags: ['Trains'],
        summary: 'Search train schedules by station names',
        description:
          'Resolves origin/destination names (matched against station name, city or code) to ' +
          'station ids and returns matching schedules for the given date.',
        parameters: [
          { name: 'originName', in: 'query', required: true, schema: { type: 'string', minLength: 1, maxLength: 100 }, example: 'Gambir' },
          { name: 'destinationName', in: 'query', required: true, schema: { type: 'string', minLength: 1, maxLength: 100 }, example: 'Bandung' },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, example: '2026-07-01' },
        ],
        responses: {
          200: { description: 'Matching train schedules.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    // --------------------------------------------------------------- Hotels
    '/api/hotels/search': {
      get: {
        tags: ['Hotels'],
        summary: 'Search hotels by city',
        description: 'Only `city` is required. Check-in/out dates, when supplied, must be YYYY-MM-DD.',
        parameters: [
          { name: 'city', in: 'query', required: true, schema: { type: 'string', minLength: 1, maxLength: 100 }, example: 'Jakarta' },
          { name: 'checkin', in: 'query', required: false, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, example: '2026-07-01' },
          { name: 'checkout', in: 'query', required: false, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, example: '2026-07-03' },
          { name: 'guests', in: 'query', required: false, schema: { type: 'integer', minimum: 1 }, example: 2 },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 0 } },
          { name: 'size', in: 'query', required: false, schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Matching hotels.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },

    // ------------------------------------------------------------- Bookings
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Create a booking',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingRequest' } } },
        },
        responses: {
          201: { description: 'Booking created.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          400: { description: 'Validation error from the booking service.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get a booking by id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Booking id.' },
        ],
        responses: {
          200: { description: 'Booking details.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/bookings/{id}/cancel': {
      post: {
        tags: ['Bookings'],
        summary: 'Cancel a booking',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Booking id.' },
        ],
        responses: {
          200: { description: 'Booking cancelled.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ------------------------------------------------------------- Payments
    '/api/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Create a payment',
        description: 'The authenticated user id is attached to the payload (`user_id`) by the gateway.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentRequest' } } },
        },
        responses: {
          200: { description: 'Payment created/processed.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          400: { description: 'Validation error from the payment service.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/api/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get a payment by id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Payment id.' },
        ],
        responses: {
          200: { description: 'Payment details.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // -------------------------------------------------------------- Pricing
    '/api/pricing/calculate': {
      get: {
        tags: ['Pricing'],
        summary: 'Calculate price (query params)',
        description: 'Authentication is optional; a valid Bearer token (if present) may unlock user-specific discounts.',
        security: [{ bearerAuth: [] }, {}],
        parameters: [
          { name: 'basePrice', in: 'query', required: true, schema: { type: 'number' }, example: 1000000 },
          { name: 'couponCode', in: 'query', required: false, schema: { type: 'string' }, example: 'PROMO10' },
          { name: 'currency', in: 'query', required: false, schema: { type: 'string' }, example: 'IDR' },
        ],
        responses: {
          200: { description: 'Pricing breakdown.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingResult' } } } },
          400: { description: 'Validation error from the pricing service.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        tags: ['Pricing'],
        summary: 'Calculate price (JSON body)',
        description: 'Authentication is optional; a valid Bearer token (if present) may unlock user-specific discounts.',
        security: [{ bearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  basePrice: { type: 'number', example: 1000000 },
                  couponCode: { type: 'string', example: 'PROMO10' },
                  currency: { type: 'string', example: 'IDR' },
                  quantity: { type: 'integer', example: 2 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Pricing breakdown.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingResult' } } } },
          400: { description: 'Validation error from the pricing service.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // -------------------------------------------------------------- Profile
    '/api/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get the current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile details.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      put: {
        tags: ['Profile'],
        summary: 'Update the current user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        responses: {
          200: { description: 'Updated profile.', content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // --------------------------------------------------------------- System
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Liveness/readiness probe. Not rate limited.',
        responses: {
          200: {
            description: 'Service is healthy.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    service: { type: 'string', example: 'api-gateway' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = openapiSpec;
