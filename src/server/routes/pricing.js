const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { calculateDriverFare } = require('../services/pricingEngine');

/**
 * POST /api/pricing/calculate-fare
 * Previews estimated fare for a given driver, distance and duration
 */
router.post('/calculate-fare', async (req, res) => {
  try {
    const { driverId, distanceKm, durationMin } = req.body;
    if (!driverId || distanceKm === undefined || durationMin === undefined) {
      return res.status(400).json({ error: 'driverId, distanceKm and durationMin are required' });
    }

    const pricing = await prisma.driverPricing.findUnique({
      where: { driverId }
    });

    const fare = calculateDriverFare(pricing, parseFloat(distanceKm), parseFloat(durationMin));

    res.json({
      driverId,
      agreedFare: fare,
      distanceKm: parseFloat(distanceKm),
      durationMin: parseFloat(durationMin)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate fare' });
  }
});

module.exports = router;
