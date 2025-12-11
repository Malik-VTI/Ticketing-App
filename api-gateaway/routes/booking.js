const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const { authenticate } = require('../middleware/auth');
const config = require('../config/config');

const bookingClient = createServiceClient(config.services.booking.baseUrl, config.services.booking.timeout);

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(bookingClient, 'POST', '/bookings', {
      data: req.body,
      authHeader: req.headers.authorization,
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * GET /api/bookings/:id
 * Get booking by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(bookingClient, 'GET', `/bookings/${req.params.id}`, {
      authHeader: req.headers.authorization,
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * GET /api/bookings/reference/:reference
 * Get booking by reference
 */
router.get('/reference/:reference', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(bookingClient, 'GET', `/bookings/reference/${req.params.reference}`, {
      authHeader: req.headers.authorization,
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * GET /api/bookings/user/:userId
 * Get user bookings
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const params = {
      limit: req.query.limit || 20,
      offset: req.query.offset || 0,
    };
    const data = await proxyRequest(bookingClient, 'GET', `/bookings/user/${req.params.userId}`, {
      params,
      authHeader: req.headers.authorization,
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking
 */
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(bookingClient, 'POST', `/bookings/${req.params.id}/cancel`, {
      authHeader: req.headers.authorization,
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;
