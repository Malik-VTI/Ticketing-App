const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/config');
const routes = require('./routes');
const openapiSpec = require('./openapi');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { dtAttributes } = require('./middleware/dtAttributes');
const logger = require('./utils/logger');
const { requestContext } = require('./utils/requestContext');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Correlation context + access log (docs/LOGGING-STANDARD.md). Registered first
// so every response — including health probes and 429s — gets one access line
// carrying request_id / trace_id. Probes are logged at DEBUG only.
app.use(requestContext);
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const status = res.statusCode;
    const path = req.originalUrl.split('?')[0];
    let level = 'info';
    if (status >= 500) level = 'error';
    else if (status >= 400) level = 'warn';
    else if (path === '/api/health') level = 'debug';
    logger[level]({
      'log.type': 'access',
      'http.request.method': req.method,
      'url.path': path,
      'http.route': req.route ? `${req.baseUrl}${req.route.path}` : '',
      'http.response.status_code': status,
      'http.response.body.size': Number(res.getHeader('content-length')) || 0,
      duration_ms: Number(process.hrtime.bigint() - start) / 1e6,
      'client.address': req.ip,
      'user_agent.original': req.get('user-agent') || '',
      ...(req.user?.id && { 'user.id': req.user.id }),
    }, 'http request');
  });
  next();
});

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

// API documentation (DOC-01) — interactive Swagger UI + raw OpenAPI JSON.
// Mounted after security headers/logging but before the 404 handler so it is
// reachable. The raw JSON is also exposed for tooling/clients that don't need the UI.
app.get('/api/docs.json', (req, res) => {
  res.json(openapiSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Ticketing App API Gateway — Docs',
}));

// Dynatrace request attributes (docs/DYNATRACE-REQUEST-ATTRIBUTES.md) — memasang
// response header X-DT-* dari field bisnis. Harus terpasang SEBELUM routes agar
// res.json sempat dibungkus.
app.use(dtAttributes);

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
