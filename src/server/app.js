const express = require('express');
const cors = require('cors');
const path = require('path');

// Express App setup
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import API Routes
const authRoutes = require('./routes/auth');
const passengerRoutes = require('./routes/passengers');
const driverRoutes = require('./routes/drivers');
const vehicleRoutes = require('./routes/vehicles');
const locationRoutes = require('./routes/locations');
const pricingRoutes = require('./routes/pricing');
const rideRoutes = require('./routes/rides');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const ratingRoutes = require('./routes/ratings');
const notificationRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');
const emergencyRoutes = require('./routes/emergency');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/uploads');

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'NIBOLODA',
    tagline: 'Drivers Set the Price. Passengers Choose the Ride.',
    commissionRate: '0%',
    timestamp: new Date()
  });
});

module.exports = app;
