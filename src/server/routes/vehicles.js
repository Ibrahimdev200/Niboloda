const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

/**
 * POST /api/vehicles
 * Create or update driver vehicle
 */
router.post('/', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const { make, model, year, color, plateNumber, registrationNumber, insuranceNumber, photoUrl } = req.body;
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    if (!make || !model || !plateNumber) {
      return res.status(400).json({ error: 'Make, model and plate number are required' });
    }

    const vehicle = await prisma.vehicle.upsert({
      where: { driverId: driver.id },
      update: {
        make,
        model,
        year: parseInt(year || 2020),
        color,
        plateNumber: plateNumber.toUpperCase(),
        ...(registrationNumber && { registrationNumber }),
        ...(insuranceNumber && { insuranceNumber }),
        ...(photoUrl && { photoUrl }),
        isVerified: false // Requires admin re-verification upon major edits
      },
      create: {
        driverId: driver.id,
        make,
        model,
        year: parseInt(year || 2020),
        color,
        plateNumber: plateNumber.toUpperCase(),
        registrationNumber: registrationNumber || null,
        insuranceNumber: insuranceNumber || null,
        photoUrl: photoUrl || null,
        isVerified: false
      }
    });

    res.json({ vehicle, message: 'Vehicle details saved and pending admin verification' });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'A vehicle with this license plate number already exists' });
    }
    res.status(500).json({ error: 'Failed to save vehicle details' });
  }
});

module.exports = router;
