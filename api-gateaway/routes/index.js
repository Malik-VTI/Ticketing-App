const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const searchRoutes = require('./search');
const bookingRoutes = require('./booking');
const paymentRoutes = require('./payment');
const flightRoutes = require('./flights');
const trainRoutes = require('./trains');
const hotelRoutes = require('./hotels');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/search', searchRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/flights', flightRoutes);
router.use('/trains', trainRoutes);
router.use('/hotels', hotelRoutes);

module.exports = router;

