const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authorization header is required',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid authorization header format. Expected: Bearer <token>',
      });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secretKey);
      req.user = {
        id: decoded.user_id,
        email: decoded.email,
      };
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'token_expired',
          message: 'Token has expired',
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'invalid_token',
          message: 'Invalid token',
        });
      }
      throw error;
    }
  } catch (error) {
    return res.status(500).json({
      error: 'internal_error',
      message: 'Authentication error',
    });
  }
};

/**
 * Optional Authentication Middleware
 * Validates token if present, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secretKey);
      req.user = {
        id: decoded.user_id,
        email: decoded.email,
      };
    } catch (error) {
      // Ignore errors for optional auth
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};

