const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const { authenticate } = require('../middleware/auth');
const config = require('../config/config');

const authClient = createServiceClient(config.services.auth.baseUrl, config.services.auth.timeout);

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const data = await proxyRequest(authClient, 'POST', '/auth/register', {
      data: req.body,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res) => {
  try {
    const data = await proxyRequest(authClient, 'POST', '/auth/login', {
      data: req.body,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const data = await proxyRequest(authClient, 'POST', '/auth/refresh', {
      data: req.body,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile (protected)
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const data = await proxyRequest(authClient, 'GET', '/auth/profile', {
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

