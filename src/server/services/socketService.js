/**
 * NIBOLODA Socket.IO Real-Time Engine
 * Broadcasts live driver location updates, ride state changes, and SOS events.
 */

let ioInstance = null;

function initSocketIO(io, prisma) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // console.log(`[Socket] Client connected: ${socket.id}`);

    // Join room based on user role / id
    socket.on('join_room', (data) => {
      const { userId, role, rideId } = data || {};
      if (userId) socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
      if (rideId) socket.join(`ride:${rideId}`);
    });

    // Driver live location ping
    socket.on('driver_location_update', async (data) => {
      const { driverId, latitude, longitude, heading, speed, activeRideId } = data || {};
      if (!driverId || !latitude || !longitude) return;

      try {
        // Update database location
        await prisma.driverLocation.upsert({
          where: { driverId },
          update: { latitude, longitude, heading: heading || 0, speed: speed || 0, updatedAt: new Date() },
          create: { driverId, latitude, longitude, heading: heading || 0, speed: speed || 0 }
        });

        // Broadcast to specific active ride if passenger is listening
        if (activeRideId) {
          io.to(`ride:${activeRideId}`).emit('location_update', {
            driverId,
            latitude,
            longitude,
            heading,
            speed,
            timestamp: new Date()
          });
        }

        // Broadcast to Admin Live Map channel
        io.to('role:ADMIN').to('role:SUPER_ADMIN').emit('admin_driver_location', {
          driverId,
          latitude,
          longitude,
          heading,
          speed,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('[Socket] Error updating driver location:', err);
      }
    });

    // SOS Emergency Trigger
    socket.on('trigger_sos', async (data) => {
      const { userId, rideId, latitude, longitude, emergencyType } = data || {};
      if (!userId) return;

      try {
        const event = await prisma.emergencyEvent.create({
          data: {
            userId,
            rideId: rideId || null,
            latitude: latitude || 0,
            longitude: longitude || 0,
            emergencyType: emergencyType || 'SOS_TRIGGERED',
            status: 'ACTIVE'
          }
        });

        // Immediately alert admins
        io.to('role:ADMIN').to('role:SUPER_ADMIN').emit('emergency_sos_alert', event);
        if (rideId) {
          io.to(`ride:${rideId}`).emit('emergency_sos_alert', event);
        }
      } catch (err) {
        console.error('[Socket] SOS trigger error:', err);
      }
    });

    socket.on('disconnect', () => {
      // socket disconnect log
    });
  });
}

function getIO() {
  return ioInstance;
}

/**
 * Emit ride status change event to ride room and participant channels
 */
function broadcastRideStatusUpdate(ride, historyNote) {
  if (!ioInstance) return;

  const eventPayload = {
    rideId: ride.id,
    status: ride.status,
    agreedFare: ride.agreedFare,
    driverId: ride.driverId,
    passengerId: ride.passengerId,
    note: historyNote,
    timestamp: new Date()
  };

  ioInstance.to(`ride:${ride.id}`).emit('ride_status_changed', eventPayload);
  ioInstance.to(`user:${ride.passengerId}`).emit('ride_status_changed', eventPayload);
  ioInstance.to(`user:${ride.driver.userId}`).emit('ride_status_changed', eventPayload);
  ioInstance.to('role:ADMIN').to('role:SUPER_ADMIN').emit('admin_ride_updated', eventPayload);
}

module.exports = {
  initSocketIO,
  getIO,
  broadcastRideStatusUpdate
};
