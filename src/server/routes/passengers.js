const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

/**
 * GET /api/passengers/profile
 */
router.get('/profile', authenticateToken, requireRoles('PASSENGER', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const passenger = await prisma.passenger.findUnique({
      where: { userId: req.user.id },
      include: {
        user: true,
        savedLocations: true,
        emergencyContacts: true,
        rides: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { driver: { include: { vehicle: true } } }
        }
      }
    });
    res.json({ passenger });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch passenger profile' });
  }
});

/**
 * PUT /api/passengers/profile
 */
router.put('/profile', authenticateToken, requireRoles('PASSENGER'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      profilePhoto,
      address,
      state,
      city,
      gender,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship
    } = req.body;

    const passenger = await prisma.passenger.update({
      where: { userId: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(profilePhoto && { profilePhoto }),
        ...(address && { address }),
        ...(state && { state }),
        ...(city && { city }),
        ...(gender && { gender }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) })
      },
      include: { emergencyContacts: true }
    });

    if (emergencyContactName && emergencyContactPhone) {
      await prisma.emergencyContact.create({
        data: {
          passengerId: passenger.id,
          name: emergencyContactName,
          phone: emergencyContactPhone,
          relationship: emergencyContactRelationship || 'Relative'
        }
      });
    }

    const updatedPassenger = await prisma.passenger.findUnique({
      where: { id: passenger.id },
      include: { user: true, savedLocations: true, emergencyContacts: true }
    });

    res.json({ passenger: updatedPassenger, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update passenger profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/passengers/saved-locations
 */
router.get('/saved-locations', authenticateToken, requireRoles('PASSENGER'), async (req, res) => {
  try {
    const passenger = await prisma.passenger.findUnique({ where: { userId: req.user.id } });
    if (!passenger) return res.status(404).json({ error: 'Passenger profile not found' });

    const locations = await prisma.savedLocation.findMany({
      where: { passengerId: passenger.id }
    });
    res.json({ locations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch saved locations' });
  }
});

/**
 * POST /api/passengers/saved-locations
 */
router.post('/saved-locations', authenticateToken, requireRoles('PASSENGER'), async (req, res) => {
  try {
    const { label, name, address, latitude, longitude } = req.body;
    const passenger = await prisma.passenger.findUnique({ where: { userId: req.user.id } });
    if (!passenger) return res.status(404).json({ error: 'Passenger profile not found' });

    const saved = await prisma.savedLocation.create({
      data: {
        passengerId: passenger.id,
        label: label || 'FAVORITE',
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    });
    res.status(201).json({ savedLocation: saved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save location' });
  }
});

/**
 * GET /api/passengers/rides
 */
router.get('/rides', authenticateToken, requireRoles('PASSENGER'), async (req, res) => {
  try {
    const passenger = await prisma.passenger.findUnique({ where: { userId: req.user.id } });
    if (!passenger) return res.status(404).json({ error: 'Passenger profile not found' });

    const rides = await prisma.ride.findMany({
      where: { passengerId: passenger.id },
      include: {
        driver: {
          include: { vehicle: true }
        },
        ratings: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ rides });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ride history' });
  }
});

module.exports = router;
