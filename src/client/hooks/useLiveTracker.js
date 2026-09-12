import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let globalSocket = null;

export const getSocket = () => {
  if (!globalSocket) {
    globalSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }
  return globalSocket;
};

/**
 * Calculates bearing angle in degrees between two GPS points
 */
export const calculateBearing = (startLat, startLng, destLat, destLng) => {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

  let brng = Math.atan2(y, x);
  brng = (brng * 180) / Math.PI;
  return (brng + 360) % 360;
};

export const useLiveTracker = ({
  role = 'PASSENGER',
  userId = null,
  activeRideId = null,
  driverId = null,
  autoTrack = false
} = {}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const watchIdRef = useRef(null);
  const lastLocationRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  // Initialize socket and join role/user/ride rooms
  useEffect(() => {
    const socket = getSocket();

    if (userId || role || activeRideId) {
      socket.emit('join_room', { userId, role, rideId: activeRideId });
    }

    return () => {
      // Keep socket open or leave specific room
    };
  }, [userId, role, activeRideId]);

  // Handle GPS location update
  const handlePositionSuccess = useCallback(
    (position) => {
      const { latitude, longitude, speed, heading, accuracy } = position.coords;

      let computedHeading = heading;
      if (computedHeading === null || isNaN(computedHeading)) {
        if (lastLocationRef.current) {
          computedHeading = calculateBearing(
            lastLocationRef.current.lat,
            lastLocationRef.current.lng,
            latitude,
            longitude
          );
        } else {
          computedHeading = 0;
        }
      }

      const nextLoc = {
        lat: latitude,
        lng: longitude,
        speed: speed || 0,
        heading: computedHeading || 0,
        accuracy: accuracy || 10,
        timestamp: new Date().toISOString()
      };

      setCurrentLocation(nextLoc);
      lastLocationRef.current = nextLoc;

      // Broadcast driver location if this is a driver
      if (role === 'DRIVER' && driverId) {
        const socket = getSocket();
        socket.emit('driver_location_update', {
          driverId,
          latitude,
          longitude,
          heading: computedHeading,
          speed: speed || 0,
          activeRideId
        });
      }
    },
    [role, driverId, activeRideId]
  );

  const handlePositionError = useCallback((err) => {
    console.warn('[LiveTracker] Geolocation error:', err.message);
    setError(err.message);
  }, []);

  // Start watching position
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    setError(null);

    // Initial immediate fetch
    navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    });

    // Continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(handlePositionSuccess, handlePositionError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000
    });
  }, [handlePositionSuccess, handlePositionError]);

  // Stop watching position
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsTracking(false);
    setIsSimulating(false);
  }, []);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoTrack) {
      startTracking();
    }
    return () => stopTracking();
  }, [autoTrack, startTracking, stopTracking]);

  /**
   * Simulate movement along a road polyline (ideal for desktop testing / demo movement)
   */
  const startSimulation = useCallback(
    (coordinates, onProgress = null, speedKmh = 50) => {
      if (!coordinates || coordinates.length < 2) return;

      stopTracking();
      setIsSimulating(true);

      let currentIndex = 0;
      const intervalMs = Math.max(800, Math.round(3600 / (coordinates.length * 2)));

      simulationIntervalRef.current = setInterval(() => {
        if (currentIndex >= coordinates.length - 1) {
          clearInterval(simulationIntervalRef.current);
          setIsSimulating(false);
          return;
        }

        const curr = coordinates[currentIndex];
        const next = coordinates[currentIndex + 1];
        const heading = calculateBearing(curr[0], curr[1], next[0], next[1]);

        const simulatedLoc = {
          lat: next[0],
          lng: next[1],
          speed: speedKmh,
          heading,
          accuracy: 5,
          timestamp: new Date().toISOString()
        };

        setCurrentLocation(simulatedLoc);
        lastLocationRef.current = simulatedLoc;

        if (role === 'DRIVER' && driverId) {
          const socket = getSocket();
          socket.emit('driver_location_update', {
            driverId,
            latitude: next[0],
            longitude: next[1],
            heading,
            speed: speedKmh,
            activeRideId
          });
        }

        if (onProgress) {
          const progressPercent = Math.round(((currentIndex + 1) / (coordinates.length - 1)) * 100);
          onProgress({
            location: simulatedLoc,
            currentIndex,
            totalPoints: coordinates.length,
            progressPercent
          });
        }

        currentIndex++;
      }, intervalMs);
    },
    [role, driverId, activeRideId, stopTracking]
  );

  return {
    currentLocation,
    isTracking,
    isSimulating,
    error,
    startTracking,
    stopTracking,
    startSimulation
  };
};
