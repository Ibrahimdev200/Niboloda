const express = require('express');
const router = express.Router();
const { 
  NIGERIAN_LANDMARKS, 
  searchLocations, 
  reverseGeocode, 
  getRouteGeometry,
  calculateHaversineDistance, 
  calculateEstimatedTime 
} = require('../services/mapService');

/**
 * GET /api/locations/search?q=Ikeja
 * Real Nigerian address search with Nominatim + landmark fallback
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const results = await searchLocations(query);
    res.json({ locations: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search locations', locations: NIGERIAN_LANDMARKS.slice(0, 5) });
  }
});

/**
 * GET /api/locations/reverse-geocode?lat=6.4281&lng=3.4219
 * Resolves GPS coordinates to address
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query params required' });
    }

    const location = await reverseGeocode(lat, lng);
    res.json({ location });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

/**
 * POST /api/locations/route-geometry
 * Returns real turn-by-turn road polyline coordinates, distance, and duration
 */
router.post('/route-geometry', async (req, res) => {
  try {
    const { pickupLat, pickupLng, destLat, destLng } = req.body;
    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Pickup and destination coordinates required' });
    }

    const route = await getRouteGeometry(
      parseFloat(pickupLat),
      parseFloat(pickupLng),
      parseFloat(destLat),
      parseFloat(destLng)
    );

    res.json({
      coordinates: route.coordinates,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      source: route.source
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate route geometry' });
  }
});

/**
 * POST /api/locations/calculate-route
 */
router.post('/calculate-route', async (req, res) => {
  try {
    const { pickupLat, pickupLng, destLat, destLng } = req.body;
    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Pickup and destination coordinates required' });
    }

    const route = await getRouteGeometry(
      parseFloat(pickupLat),
      parseFloat(pickupLng),
      parseFloat(destLat),
      parseFloat(destLng)
    );

    res.json({
      distanceKm: route.distanceKm,
      durationMin: route.durationMin
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

module.exports = router;
