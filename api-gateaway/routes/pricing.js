const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const { authenticate, optionalAuth } = require('../middleware/auth');
const config = require('../config/config');

const pricingClient = createServiceClient(config.services.pricing.baseUrl || 'http://localhost:8086', config.services.pricing.timeout);

/**
 * GET /api/pricing/calculate
 * Calculate price with taxes and discounts
 */
router.get('/calculate', optionalAuth, async (req, res) => {
  try {
    const data = await proxyRequest(pricingClient, 'GET', '/pricing/calculate', {
      params: req.query,
      authHeader: req.headers.authorization,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;
