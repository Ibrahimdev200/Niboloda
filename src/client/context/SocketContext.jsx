import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [activeRideUpdate, setActiveRideUpdate] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  useEffect(() => {
    const socketIo = io(window.location.origin);

    socketIo.on('connect', () => {
      // console.log('[SocketClient] Connected to server socket:', socketIo.id);
      if (user) {
        socketIo.emit('join_room', { userId: user.id, role: user.role });
      }
    });

    socketIo.on('ride_status_changed', (data) => {
      console.log('[SocketClient] Ride status changed:', data);
      setActiveRideUpdate(data);
    });

    socketIo.on('location_update', (data) => {
      setDriverLocation(data);
    });

    socketIo.on('admin_driver_location', (data) => {
      setDriverLocation(data);
    });

    socketIo.on('emergency_sos_alert', (data) => {
      console.warn('[SocketClient] SOS Emergency Alert received:', data);
      setEmergencyAlert(data);
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [user]);

  // Emit GPS Location from Driver App
  const emitDriverLocation = (driverId, lat, lng, heading = 0, speed = 0, activeRideId = null) => {
    if (socket) {
      socket.emit('driver_location_update', {
        driverId,
        latitude: lat,
        longitude: lng,
        heading,
        speed,
        activeRideId
      });
    }
  };

  // Emit SOS Emergency Alert
  const triggerSOS = (userId, rideId, lat, lng, type = 'SOS_TRIGGERED') => {
    if (socket) {
      socket.emit('trigger_sos', {
        userId,
        rideId,
        latitude: lat,
        longitude: lng,
        emergencyType: type
      });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      activeRideUpdate,
      driverLocation,
      emergencyAlert,
      emitDriverLocation,
      triggerSOS
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
