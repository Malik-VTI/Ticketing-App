const express = require('express');
const router = express.Router();
const { createServiceClient, proxyRequest } = require('../utils/httpClient');
const config = require('../config/config');

const TRAIN_SERVICE_URL = config.services.train.baseUrl;
const trainClient = createServiceClient(TRAIN_SERVICE_URL, config.services.train.timeout);

// Utility fetch stations (autocomplete/search)
const fetchStations = async () => {
  return proxyRequest(trainClient, 'GET', '/admin/trains/stations', {
    params: { page: 0, size: 100, sortBy: 'name', direction: 'ASC' }
  });
};

// GET /api/trains/schedules
router.get('/schedules', async (req, res) => {
  try {
    const { origin, destination, date, page, size, sortBy, direction } = req.query;

    const params = {
      origin,
      destination,
      date,
      page: page || 0,
      size: size || 20,
      sortBy: sortBy || 'departureTime',
      direction: direction || 'ASC'
    };

    const data = await proxyRequest(trainClient, 'GET', '/trains/schedules', { params });
    res.json(data);

  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/trains/search?originName=&destinationName=&date=
router.get('/search', async (req, res) => {
  try {
    const { originName, destinationName, date } = req.query;

    if (!originName || !destinationName || !date) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'originName, destinationName, and date are required'
      });
    }

    const stationResponse = await fetchStations();
    const stations = stationResponse.content || stationResponse;

    const matchStation = (name) => {
      const lower = name.toLowerCase().trim();
      return stations.find((station) => {
        return (
          station.name.toLowerCase() === lower ||
          station.code?.toLowerCase() === lower ||
          station.city?.toLowerCase() === lower ||
          `${station.name} (${station.city})`.toLowerCase() === lower
        );
      });
    };

    const originStation = matchStation(originName);
    const destinationStation = matchStation(destinationName);

    if (!originStation || !destinationStation) {
      return res.status(404).json({
        error: 'station_not_found',
        message: 'One or both stations not found. Please check the names.'
      });
    }

    const schedules = await proxyRequest(trainClient, 'GET', '/trains/schedules', {
      params: { origin: originStation.id, destination: destinationStation.id, date }
    });

    res.json(schedules);

  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/trains/stations
router.get('/stations', async (req, res) => {
  try {
    const data = await fetchStations();
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/trains/schedules/:id
router.get('/schedules/:id', async (req, res) => {
  try {
    const data = await proxyRequest(trainClient, 'GET', `/trains/schedules/${req.params.id}`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/trains/schedules/:id/seats
router.get('/schedules/:id/seats', async (req, res) => {
  try {
    const data = await proxyRequest(trainClient, 'GET', `/trains/schedules/${req.params.id}/seats`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

// GET /api/trains/schedules/:id/seats/available
router.get('/schedules/:id/seats/available', async (req, res) => {
  try {
    const data = await proxyRequest(trainClient, 'GET', `/trains/schedules/${req.params.id}/seats/available`);
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json(error.data || { error: error.message });
  }
});

module.exports = router;
