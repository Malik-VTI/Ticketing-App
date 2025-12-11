const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const { authenticate } = require('../middleware/auth');
const config = require('../config/config');

const paymentClient = createServiceClient(config.services.payment.baseUrl, config.services.payment.timeout);

/**
 * POST /api/payments
 * Create payment (protected)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(paymentClient, 'POST', '/payments', {
      data: {
        ...req.body,
        user_id: req.user.id, // Ensure user_id matches authenticated user
      },
      headers: {
        Authorization: req.headers.authorization,
      },
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * GET /api/payments/:id
 * Get payment details (protected)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(paymentClient, 'GET', `/payments/${req.params.id}`, {
      headers: {
        Authorization: req.headers.authorization,
      },
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * POST /api/payments/:id/refund
 * Process refund (protected)
 */
router.post('/:id/refund', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(paymentClient, 'POST', `/payments/${req.params.id}/refund`, {
      headers: {
        Authorization: req.headers.authorization,
      },
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;

