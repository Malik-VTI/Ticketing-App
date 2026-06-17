const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/config');
const routes = require('./routes');
const openapiSpec = require('./openapi');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint — registered BEFORE rate limiter so that
// Kubernetes liveness/readiness probes are never throttled (429).
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// Rate limiting (applied to all /api/ routes EXCEPT /api/health above)
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'too_many_requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // extra safety — skip health inside /api/
});

app.use('/api/', limiter);

// Security headers (SEC-06) — applied to all responses, before routes
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Request logging middleware (structured, all environments).
// Logs each request when its response finishes. No request/correlation IDs
// are added here — Dynatrace OneAgent handles trace correlation.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start }, 'request');
  });
  next();
});

// API documentation (DOC-01) — interactive Swagger UI + raw OpenAPI JSON.
// Mounted after security headers/logging but before the 404 handler so it is
// reachable. The raw JSON is also exposed for tooling/clients that don't need the UI.
app.get('/api/docs.json', (req, res) => {
  res.json(openapiSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Ticketing App API Gateway — Docs',
}));

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'API Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      search: '/api/search',
      bookings: '/api/bookings',
      payments: '/api/payments',
      flights: '/api/flights',
      trains: '/api/trains',
      hotels: '/api/hotels',
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  logger.info(
    {
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV || 'development',
      services: {
        auth: config.services.auth.baseUrl,
        booking: config.services.booking.baseUrl,
        payment: config.services.payment.baseUrl,
        flight: config.services.flight.baseUrl,
        train: config.services.train.baseUrl,
        hotel: config.services.hotel.baseUrl,
        pricing: config.services.pricing.baseUrl,
      },
    },
    'API Gateway started'
  );
});

module.exports = app;
