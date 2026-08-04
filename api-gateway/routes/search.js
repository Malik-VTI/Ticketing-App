const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest, aggregateRequests } = require('../utils/httpClient');
const { optionalAuth } = require('../middleware/auth');
const config = require('../config/config');

const pricingClient = createServiceClient(config.services.pricing.baseUrl, config.services.pricing.timeout);

// SearchController di pricing-service dipetakan ke @RequestMapping("/api/search"),
// berbeda dari PricingController yang memakai "/pricing" tanpa awalan. Prefiks ini
// harus ikut dikirim — tanpa itu Spring jatuh ke static resource handler dan
// membalas 500 NoResourceFoundException, bukan 404.
const SEARCH_BASE = '/api/search';

/**
 * GET /api/search/flights
 * Search flights
 */
router.get('/flights', optionalAuth, async (req, res) => {
  try {
    const data = await proxyRequest(pricingClient, 'GET', `${SEARCH_BASE}/flights`, {
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
    const data = await proxyRequest(pricingClient, 'GET', `${SEARCH_BASE}/trains`, {
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
    const data = await proxyRequest(pricingClient, 'GET', `${SEARCH_BASE}/hotels`, {
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

