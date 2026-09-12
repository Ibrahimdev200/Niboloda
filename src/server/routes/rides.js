const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { calculateHaversineDistance, calculateEstimatedTime } = require('../services/mapService');
const { calculateDriverFare } = require('../services/pricingEngine');
const { broadcastRideStatusUpdate } = require('../services/socketService');
const { SEARCH_RADIUS_KM } = require('../config');

/**
 * POST /api/rides/search-drivers
 * Finds verified, online, subscribed drivers within search radius & calculates custom fares.
 */
router.post('/search-drivers', authenticateToken, requireRoles('PASSENGER'), async (req, res) => {
  try {
    const { pickupLat, pickupLng, destLat, destLng, sortBy = 'LOWEST_PRICE' } = req.body;

    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Pickup and destination coordinates required' });
    }

    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    // Calculate trip route distance & estimated duration
    const routeDistanceKm = calculateHaversineDistance(pLat, pLng, dLat, dLng);
    const routeDurationMin = calculateEstimatedTime(routeDistanceKm);

    // Find verified, online drivers with active subscription
    const drivers = await prisma.driver.findMany({
      where: {
        isOnline: true,
        isVerified: true,
        verificationStatus: 'APPROVED',
        vehicle: {
          isVerified: true
        },
        subscriptions: {
          some: {
            status: 'ACTIVE',
            expiryDate: { gt: new Date() }
          }
        }
      },
      include: {
        vehicle: true,
        pricing: true,
        locations: true
      }
    });

    const now = new Date();
    const availableDrivers = [];

    for (const driver of drivers) {
      // Get driver current GPS location (or default near pickup for simulation if missing)
      const lastLoc = driver.locations && driver.locations.length > 0 ? driver.locations[0] : null;
      const driverLat = lastLoc ? lastLoc.latitude : pLat + (Math.random() - 0.5) * 0.02;
      const driverLng = lastLoc ? lastLoc.longitude : pLng + (Math.random() - 0.5) * 0.02;

      // Distance from driver to pickup
      const distanceToPickup = calculateHaversineDistance(driverLat, driverLng, pLat, pLng);

      // Filter by search radius (admin default e.g. 15 km)
      if (distanceToPickup > SEARCH_RADIUS_KM) continue;

      // ETA to pickup
      const etaToPickupMin = calculateEstimatedTime(distanceToPickup);

      // Calculate driver's dynamic fare for this specific route
      const dynamicFare = calculateDriverFare(driver.pricing, routeDistanceKm, routeDurationMin);

      availableDrivers.push({
        driverId: driver.id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        driverPhoto: driver.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        rating: driver.rating,
        totalRides: driver.totalRides,
        vehicle: {
          make: driver.vehicle?.make || 'Toyota',
          model: driver.vehicle?.model || 'Corolla',
          color: driver.vehicle?.color || 'Silver',
          plateNumber: driver.vehicle?.plateNumber || 'LAG-123-XY'
        },
        distanceToPickupKm: distanceToPickup,
        etaToPickupMin,
        calculatedFare: dynamicFare,
        pricingRules: driver.pricing
      });
    }

    // Sort according to passenger preference
    availableDrivers.sort((a, b) => {
      if (sortBy === 'LOWEST_PRICE') return a.calculatedFare - b.calculatedFare;
      if (sortBy === 'CLOSEST_DRIVER') return a.distanceToPickupKm - b.distanceToPickupKm;
      if (sortBy === 'HIGHEST_RATING') return b.rating - a.rating;
      if (sortBy === 'FASTEST_ARRIVAL') return a.etaToPickupMin - b.etaToPickupMin;
      return a.calculatedFare - b.calculatedFare;
    });

    res.json({
      routeDistanceKm,
      routeDurationMin,
      totalDriversFound: availableDrivers.length,
      drivers: availableDrivers
    });
  } catch (err) {
    console.error('Search drivers error:', err);
    res.status(500).json({ error: 'Failed to search nearby drivers' });
  }
});

/**
 * POST /api/rides/request
 * Passenger creates ride request for specific selected driver
 */
router.post('/request', authenticateToken, requireRoles('PASSENGER'), async (req, res) => {
  try {
    const { driverId, pickupName, pickupLat, pickupLng, destName, destLat, destLng, distanceKm, durationMin, agreedFare, paymentMethod = 'CARD' } = req.body;

    const passenger = await prisma.passenger.findUnique({ where: { userId: req.user.id } });
    if (!passenger) return res.status(404).json({ error: 'Passenger profile not found' });

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true }
    });

    if (!driver || !driver.isOnline || !driver.isVerified) {
      return res.status(400).json({ error: 'Selected driver is no longer online or available' });
    }

    // Create ride record with LOCKED agreed fare
    const ride = await prisma.ride.create({
      data: {
        passengerId: passenger.id,
        driverId: driver.id,
        status: 'REQUESTED',
        pickupName,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        destName,
        destLat: parseFloat(destLat),
        destLng: parseFloat(destLng),
        distanceKm: parseFloat(distanceKm),
        durationMin: parseFloat(durationMin),
        agreedFare: parseFloat(agreedFare),
        driverCommission: 0.0, // Strictly 0% NIBOLODA commission
        paymentMethod
      },
      include: {
        passenger: true,
        driver: { include: { vehicle: true } }
      }
    });

    // Record status history
    await prisma.rideStatusHistory.create({
      data: {
        rideId: ride.id,
        status: 'REQUESTED',
        changedBy: req.user.id,
        notes: `Requested driver ${driver.firstName} at agreed fare ₦${agreedFare}`
      }
    });

    broadcastRideStatusUpdate(ride, `New ride request sent to ${driver.firstName}`);

    res.status(201).json({ ride });
  } catch (err) {
    console.error('Create ride error:', err);
    res.status(500).json({ error: 'Failed to request ride' });
  }
});

/**
 * POST /api/rides/:id/respond
 * Driver ACCEPTS or DECLINES ride request
 */
router.post('/:id/respond', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const { action } = req.body; // ACCEPT or DECLINE
    const rideId = req.params.id;

    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { passenger: true, driver: { include: { user: true, vehicle: true } } }
    });

    if (!ride || ride.driverId !== driver.id) {
      return res.status(404).json({ error: 'Ride request not found or assigned to another driver' });
    }

    const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'CANCELLED_BY_DRIVER';

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: newStatus,
        ...(action === 'DECLINE' && { cancelledAt: new Date(), cancellationReason: 'Declined by driver' })
      },
      include: { passenger: true, driver: { include: { user: true, vehicle: true } } }
    });

    await prisma.rideStatusHistory.create({
      data: {
        rideId: ride.id,
        status: newStatus,
        changedBy: req.user.id,
        notes: action === 'ACCEPT' ? 'Driver accepted ride request' : 'Driver declined ride request'
      }
    });

    broadcastRideStatusUpdate(updatedRide, action === 'ACCEPT' ? 'Driver accepted your ride' : 'Driver declined request');

    res.json({ ride: updatedRide });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process driver response' });
  }
});

/**
 * POST /api/rides/:id/arrived
 */
router.post('/:id/arrived', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const rideId = req.params.id;
    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'DRIVER_ARRIVED' },
      include: { passenger: true, driver: { include: { user: true, vehicle: true } } }
    });

    await prisma.rideStatusHistory.create({
      data: { rideId, status: 'DRIVER_ARRIVED', changedBy: req.user.id, notes: 'Driver arrived at pickup point' }
    });

    broadcastRideStatusUpdate(updatedRide, 'Driver has arrived at pickup location');
    res.json({ ride: updatedRide });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * POST /api/rides/:id/start
 */
router.post('/:id/start', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const rideId = req.params.id;
    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'TRIP_STARTED', startedAt: new Date() },
      include: { passenger: true, driver: { include: { user: true, vehicle: true } } }
    });

    await prisma.rideStatusHistory.create({
      data: { rideId, status: 'TRIP_STARTED', changedBy: req.user.id, notes: 'Trip started' }
    });

    broadcastRideStatusUpdate(updatedRide, 'Trip has started');
    res.json({ ride: updatedRide });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start trip' });
  }
});

/**
 * POST /api/rides/:id/end
 * End trip and finalize payment at LOCKED agreed price. 0% NIBOLODA commission.
 */
router.post('/:id/end', authenticateToken, requireRoles('DRIVER'), async (req, res) => {
  try {
    const rideId = req.params.id;
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { passenger: true, driver: { include: { user: true, vehicle: true } } }
    });

    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    // Ensure final fare is locked at agreed price
    const finalFare = ride.agreedFare;
    const driverEarnings = finalFare; // 100% to driver
    const platformCommission = 0.0;   // 0% to platform

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'TRIP_COMPLETED',
        paymentStatus: 'SUCCESS',
        completedAt: new Date()
      },
      include: { passenger: true, driver: { include: { user: true, vehicle: true } } }
    });

    // Increment ride counts for passenger & driver
    await prisma.passenger.update({
      where: { id: ride.passengerId },
      data: { totalRides: { increment: 1 } }
    });
    await prisma.driver.update({
      where: { id: ride.driverId },
      data: { totalRides: { increment: 1 } }
    });

    // Create payment transaction record
    await prisma.payment.create({
      data: {
        rideId,
        userId: ride.passenger.userId,
        amount: finalFare,
        provider: 'PAYSTACK',
        providerRef: `NIB_RIDE_${Date.now()}`,
        status: 'SUCCESS',
        type: 'RIDE_FARE',
        gatewayFee: Math.round(finalFare * 0.015),
        driverEarnings,
        commission: platformCommission
      }
    });

    await prisma.rideStatusHistory.create({
      data: { rideId, status: 'TRIP_COMPLETED', changedBy: req.user.id, notes: `Trip completed. Locked fare: ₦${finalFare}` }
    });

    broadcastRideStatusUpdate(updatedRide, 'Trip completed successfully');
    res.json({ ride: updatedRide, message: 'Trip completed and payment settled' });
  } catch (err) {
    console.error('End trip error:', err);
    res.status(500).json({ error: 'Failed to complete trip' });
  }
});

/**
 * GET /api/rides/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ride = await prisma.ride.findUnique({
      where: { id: req.params.id },
      include: {
        passenger: true,
        driver: { include: { vehicle: true } },
        statusHistory: { orderBy: { timestamp: 'asc' } },
        payments: true,
        ratings: true
      }
    });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    res.json({ ride });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ride details' });
  }
});

/**
 * POST /api/rides/:id/cancel
 */
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const rideId = req.params.id;
    const isPassenger = req.user.role === 'PASSENGER';

    const newStatus = isPassenger ? 'CANCELLED_BY_PASSENGER' : 'CANCELLED_BY_DRIVER';

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        status: newStatus,
        cancelledAt: new Date(),
        cancelledBy: req.user.role,
        cancellationReason: reason || 'User requested cancellation'
      },
      include: { passenger: true, driver: { include: { user: true, vehicle: true } } }
    });

    await prisma.rideStatusHistory.create({
      data: {
        rideId,
        status: newStatus,
        changedBy: req.user.id,
        notes: `Cancelled by ${req.user.role}: ${reason || 'No reason provided'}`
      }
    });

    broadcastRideStatusUpdate(updatedRide, `Ride cancelled by ${req.user.role}`);
    res.json({ ride: updatedRide });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
});

module.exports = router;
