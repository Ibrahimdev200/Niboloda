const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.post('/sos', authenticateToken, async (req, res) => {
  try {
    const { rideId, latitude, longitude, emergencyType = 'SOS_TRIGGERED' } = req.body;

    const event = await prisma.emergencyEvent.create({
      data: {
        userId: req.user.id,
        rideId: rideId || null,
        latitude: parseFloat(latitude || 0),
        longitude: parseFloat(longitude || 0),
        emergencyType,
        status: 'ACTIVE'
      }
    });

    res.status(201).json({
      event,
      message: 'SOS Emergency Alert dispatched to NIBOLODA security center and local emergency contacts'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record emergency event' });
  }
});

module.exports = router;
