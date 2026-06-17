require('dotenv').config({ path: '../../.env' });
const logger = require('../utils/logger');

const gatewayPort = process.env.API_GATEWAY_PORT;
const port = process.env.PORT || (gatewayPort && !gatewayPort.startsWith('tcp') ? gatewayPort : 3000);

if (!process.env.JWT_SECRET_KEY) {
  logger.error('FATAL ERROR: JWT_SECRET_KEY is not defined in environment variables.');
  process.exit(1);
}

const config = {
  server: {
    port: port,
    host: process.env.HOST || '0.0.0.0',
  },
  
  jwt: {
    secretKey: process.env.JWT_SECRET_KEY,
    accessExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY) || 15, // minutes
  },

  // Microservices endpoints
  services: {
    auth: {
      baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:8081',
      timeout: 5000,
    },
    booking: {
      baseUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:8082',
      timeout: 10000,
    },
    payment: {
      baseUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8089',
      timeout: 10000,
    },
    flight: {
      baseUrl: process.env.FLIGHT_SERVICE_URL || 'http://localhost:8083',
      timeout: 5000,
    },
    train: {
      baseUrl: process.env.TRAIN_SERVICE_URL || 'http://localhost:8084',
      timeout: 5000,
    },
    hotel: {
      baseUrl: process.env.HOTEL_SERVICE_URL || 'http://localhost:8085',
      timeout: 5000,
    },
    pricing: {
      baseUrl: process.env.PRICING_SERVICE_URL || 'http://localhost:8086',
      timeout: 5000,
    },
    profile: {
      baseUrl: process.env.PROFILE_SERVICE_URL || 'http://localhost:8090',
      timeout: 5000,
    },
    notification: {
      baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8087',
      timeout: 5000,
    },
    admin: {
      baseUrl: process.env.ADMIN_SERVICE_URL || 'http://localhost:8088',
      timeout: 5000,
    },
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://ticketing-app.local',
    credentials: true,
  },
};

module.exports = config;

