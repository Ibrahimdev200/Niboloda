const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateToken, requireRoles } = require('../middleware/auth');

/**
 * POST /api/ratings
 * Passenger rates driver after completed trip
 */
router.post('/', authenticateToken, requireRoles('PASSENGER'), async (req, res) => {
  try {
    const { rideId, ratingStars, reviewText } = req.body;

    const passenger = await prisma.passenger.findUnique({ where: { userId: req.user.id } });
    if (!passenger) return res.status(404).json({ error: 'Passenger profile not found' });

    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride || ride.passengerId !== passenger.id) {
      return res.status(404).json({ error: 'Completed ride not found' });
    }

    if (ride.status !== 'TRIP_COMPLETED') {
      return res.status(400).json({ error: 'Rating can only be submitted for completed trips' });
    }

    // Check duplicate rating for same ride
    const existingRating = await prisma.rating.findUnique({ where: { rideId } });
    if (existingRating) {
      return res.status(400).json({ error: 'You have already rated this ride' });
    }

    const stars = Math.min(5, Math.max(1, parseInt(ratingStars || 5)));

    const rating = await prisma.rating.create({
      data: {
        rideId,
        passengerId: passenger.id,
        driverId: ride.driverId,
        ratingStars: stars,
        reviewText: reviewText || null
      }
    });

    // Recalculate Driver Average Rating
    const allDriverRatings = await prisma.rating.findMany({
      where: { driverId: ride.driverId }
    });

    const avgRating = allDriverRatings.reduce((sum, r) => sum + r.ratingStars, 0) / allDriverRatings.length;
    const roundedAvg = Math.round(avgRating * 10) / 10;

    await prisma.driver.update({
      where: { id: ride.driverId },
      data: { rating: roundedAvg }
    });

    res.status(201).json({ rating, newDriverRating: roundedAvg, message: 'Rating submitted successfully' });
  } catch (err) {
    console.error('Submit rating error:', err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

module.exports = router;
