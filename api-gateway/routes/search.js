const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest, aggregateRequests } = require('../utils/httpClient');
const { optionalAuth } = require('../middleware/auth');
const config = require('../config/config');

const pricingClient = createServiceClient(config.services.pricing.baseUrl, config.services.pricing.timeout);

/**
 * GET /api/search/flights
 * Search flights
 */
router.get('/flights', optionalAuth, async (req, res) => {
  try {
    const data = await proxyRequest(pricingClient, 'GET', '/search/flights', {
      params: req.query,
      userId: req.user?.id,
      userEmail: req.user?.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * GET /api/search/trains
 * Search trains
 */
router.get('/trains', optionalAuth, async (req, res) => {
  try {
    const data = await proxyRequest(pricingClient, 'GET', '/search/trains', {
      params: req.query,
      userId: req.user?.id,
      userEmail: req.user?.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * GET /api/search/hotels
 * Search hotels
 */
router.get('/hotels', optionalAuth, async (req, res) => {
  try {
    const data = await proxyRequest(pricingClient, 'GET', '/search/hotels', {
      params: req.query,
      userId: req.user?.id,
      userEmail: req.user?.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;

