const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./config');
const prisma = require('./db');
const { initSocketIO } = require('./services/socketService');

// Express App setup
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

initSocketIO(io, prisma);

// Middleware
app.use(cors());
app.use(express.json());

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

// Serve frontend in production build if dist folder exists
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.use((req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.send(`
        <html>
          <head><title>NIBOLODA API Server</title></head>
          <body style="font-family: system-ui; padding: 2rem; background: #0b1f14; color: white;">
            <h1>🚕 NIBOLODA API Server Running</h1>
            <p>Drivers Set the Price. Passengers Choose the Ride.</p>
            <p>Commission: <strong>0%</strong></p>
            <p>API Status: <span style="color: #4ade80;">Active on Port ${PORT}</span></p>
          </body>
        </html>
      `);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 NIBOLODA Full-Stack Server running at http://localhost:${PORT}`);
});
