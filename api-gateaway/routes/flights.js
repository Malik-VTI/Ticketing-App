const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const config = require('../config/config');

const flightClient = createServiceClient(config.services.flight.baseUrl, config.services.flight.timeout);

const fetchAirports = async () => {
  return proxyRequest(flightClient, 'GET', '/admin/flights/airports', {
    params: {
      page: 0,
      size: 1000,
      sortBy: 'name',
      direction: 'ASC',
    },
  });
};

// GET /api/flights/schedules
router.get('/schedules', async (req, res) => {
  try {
    const { origin, destination, date, page, size, sortBy, direction } = req.query;
    
    // If search parameters provided, use search method
    if (origin && destination && date) {
      const data = await proxyRequest(flightClient, 'GET', '/flights/schedules', {
        params: { origin, destination, date },
      });
      res.json(data);
    } else {
      // Otherwise, use paginated endpoint (public endpoint handles pagination)
      const params = {
        page: page || 0,
        size: size || 20,
        sortBy: sortBy || 'departureTime',
        direction: direction || 'ASC',
      };
      const data = await proxyRequest(flightClient, 'GET', '/flights/schedules', {
        params,
      });
      res.json(data);
    }
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/flights/search?originName=&destinationName=&date=
router.get('/search', async (req, res) => {
  try {
    const { originName, destinationName, date } = req.query;

    if (!originName || !destinationName || !date) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'originName, destinationName, and date are required',
      });
    }

    const airportsResponse = await fetchAirports();
    const airports = airportsResponse.content || [];

    const matchAirport = (name) => {
      const lower = name.toLowerCase().trim();
      return airports.find((airport) => {
        return (
          airport.name.toLowerCase() === lower ||
          airport.city?.toLowerCase() === lower ||
          airport.code?.toLowerCase() === lower ||
          `${airport.name} (${airport.city})`.toLowerCase() === lower
        );
      });
    };

    const originAirport = matchAirport(originName);
    const destinationAirport = matchAirport(destinationName);

    if (!originAirport || !destinationAirport) {
      return res.status(404).json({
        error: 'airport_not_found',
        message: 'One or both airports not found. Please check the names.',
      });
    }

    const schedules = await proxyRequest(flightClient, 'GET', '/flights/schedules', {
      params: {
        origin: originAirport.id,
        destination: destinationAirport.id,
        date,
      },
    });

    res.json(schedules);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/flights/airports
router.get('/airports', async (req, res) => {
  try {
    const data = await fetchAirports();
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/flights/schedules/:id
router.get('/schedules/:id', async (req, res) => {
  try {
    const data = await proxyRequest(flightClient, 'GET', `/flights/schedules/${req.params.id}`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/flights/schedules/:id/seats
router.get('/schedules/:id/seats', async (req, res) => {
  try {
    const data = await proxyRequest(flightClient, 'GET', `/flights/schedules/${req.params.id}/seats`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/flights/schedules/:id/seats/available
router.get('/schedules/:id/seats/available', async (req, res) => {
  try {
    const data = await proxyRequest(flightClient, 'GET', `/flights/schedules/${req.params.id}/seats/available`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;

