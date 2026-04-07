const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const { authenticate } = require('../middleware/auth');
const config = require('../config/config');

const flightClient = createServiceClient(config.services.flight.baseUrl, config.services.flight.timeout);
const trainClient = createServiceClient(config.services.train.baseUrl, config.services.train.timeout);
const hotelClient = createServiceClient(config.services.hotel.baseUrl, config.services.hotel.timeout);

/**
 * GET /api/admin/metrics
 * Protected route to get dashboard metrics
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(adminClient, 'GET', '/api/admin/metrics', {
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
 * Administrative endpoints for CRUD on other services
 */

// Flights
router.post('/flights', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(flightClient, 'POST', '/admin/flights', {
      data: req.body,
      authHeader: req.headers.authorization,
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// Trains
router.post('/trains', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(trainClient, 'POST', '/admin/trains/trains', {
      data: req.body,
      authHeader: req.headers.authorization,
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// Hotels
router.post('/hotels', authenticate, async (req, res) => {
  try {
    // Note: Assuming hotel-service has POST /admin/hotels
    const data = await proxyRequest(hotelClient, 'POST', '/admin/hotels', {
      data: req.body,
      authHeader: req.headers.authorization,
    });
    res.status(201).json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;
