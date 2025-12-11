const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

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

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'too_many_requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

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
  console.log(`=================================`);
  console.log(`API Gateway Server`);
  console.log(`=================================`);
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Services configured:`);
  console.log(`  - Auth: ${config.services.auth.baseUrl}`);
  console.log(`  - Booking: ${config.services.booking.baseUrl}`);
  console.log(`  - Payment: ${config.services.payment.baseUrl}`);
  console.log(`  - Flights: ${config.services.flight.baseUrl}`);
  console.log(`  - Train: ${config.services.train.baseUrl}`);
  console.log(`  - Hotel: ${config.services.hotel.baseUrl}`);
  console.log(`  - Pricing: ${config.services.pricing.baseUrl}`);
  console.log(`=================================`);
});

module.exports = app;
