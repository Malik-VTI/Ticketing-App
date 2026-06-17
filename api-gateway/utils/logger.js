/**
 * Structured JSON logger for the API Gateway.
 *
 * Uses pino to emit one JSON object per line to stdout. Log correlation
 * (request / trace / span IDs) is intentionally NOT added here — Dynatrace
 * OneAgent injects and correlates that context automatically.
 */
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

module.exports = logger;
