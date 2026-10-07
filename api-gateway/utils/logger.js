/**
 * Structured JSON logger for the API Gateway.
 *
 * Emits the standard ticketing-app log schema (docs/LOGGING-STANDARD.md) —
 * the same keys as the Go (slog) and Java (logback) services: timestamp,
 * level, message, service.*, log.type, request_id, trace_id.
 */
const pino = require('pino');
const { getContext } = require('./requestContext');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  messageKey: 'message',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  base: {
    'service.name': 'api-gateway',
    'service.version': process.env.SERVICE_VERSION || 'unknown',
    'deployment.environment': process.env.DEPLOYMENT_ENV || 'dev',
  },
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  // Defaults merged into every line; fields passed at the call site win.
  mixin: () => ({ 'log.type': 'app', ...getContext() }),
});

/**
 * Log a business / security event with the standard event fields.
 * @param {'business'|'security'|'audit'} type
 */
logger.event = (type, eventName, message, fields = {}, level = 'info') => {
  logger[level]({ 'log.type': type, 'event.name': eventName, ...fields }, message);
};

module.exports = logger;
