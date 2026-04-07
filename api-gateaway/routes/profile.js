const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const { authenticate } = require('../middleware/auth');
const config = require('../config/config');

const profileClient = createServiceClient(config.services.profile.baseUrl || 'http://localhost:8085', config.services.profile.timeout);

/**
 * GET /api/profile
 * Get current user profile
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(profileClient, 'GET', '/profile', {
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
 * PUT /api/profile
 * Update current user profile
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(profileClient, 'PUT', '/profile', {
      data: req.body,
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
 * PUT /api/profile/password
 * Update current user password
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(profileClient, 'PUT', '/profile/password', {
      data: req.body,
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
