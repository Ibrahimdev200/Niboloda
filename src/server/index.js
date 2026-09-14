const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const express = require('express');
const { PORT } = require('./config');
const prisma = require('./db');
const { initSocketIO } = require('./services/socketService');
const app = require('./app');

// HTTP Server setup
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

initSocketIO(io, prisma);

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
