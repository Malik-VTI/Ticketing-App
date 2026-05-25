const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const config = require('../config/config');

const hotelClient = createServiceClient(config.services.hotel.baseUrl, config.services.hotel.timeout);

// GET /api/hotels - List hotels with pagination and search
router.get('/', async (req, res) => {
  try {
    const data = await proxyRequest(hotelClient, 'GET', '/hotels', {
      params: req.query,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/hotels/search?city=&checkin=&checkout=&guests=
router.get('/search', async (req, res) => {
  try {
    const { city, checkin, checkout, guests, page, size } = req.query;

    if (!city) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'city is required',
      });
    }

    const params = {
      city,
      checkin,
      checkout,
      guests,
      page: page || 0,
      size: size || 20,
    };

    const hotels = await proxyRequest(hotelClient, 'GET', '/hotels', {
      params,
    });

    res.json(hotels);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/hotels/:id - Get hotel details
router.get('/:id', async (req, res) => {
  try {
    const data = await proxyRequest(hotelClient, 'GET', `/hotels/${req.params.id}`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/hotels/:id/rooms - Get available rooms
router.get('/:id/rooms', async (req, res) => {
  try {
    const data = await proxyRequest(hotelClient, 'GET', `/hotels/${req.params.id}/rooms`, {
      params: req.query,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/hotels/:id/rates - Get room rates
router.get('/:id/rates', async (req, res) => {
  try {
    const data = await proxyRequest(hotelClient, 'GET', `/hotels/${req.params.id}/rates`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;

