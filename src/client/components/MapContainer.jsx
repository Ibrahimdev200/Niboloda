import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Compass } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// Fix default Leaflet icon assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom HTML Markers
const createPickupMarker = () =>
  L.divIcon({
    className: 'custom-pickup-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="width: 26px; height: 26px; background: #10b981; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.7); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
        </div>
        <div style="position: absolute; bottom: -8px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #10b981;"></div>
      </div>
    `,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -34]
  });

const createDestMarker = () =>
  L.divIcon({
    className: 'custom-dest-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="width: 26px; height: 26px; background: #ef4444; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.7); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
        </div>
        <div style="position: absolute; bottom: -8px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #ef4444;"></div>
      </div>
    `,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -34]
  });

const createVehicleMarker = (heading = 0, label = 'Driver') =>
  L.divIcon({
    className: 'custom-car-marker',
    html: `
      <div style="transform: rotate(${heading}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center;">
        <div style="width: 38px; height: 38px; background: #0f172a; border: 2.5px solid #10b981; border-radius: 50%; box-shadow: 0 6px 22px rgba(0, 0, 0, 0.5), 0 0 14px rgba(16, 185, 129, 0.6); display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22]
  });

const createUserGpsMarker = () =>
  L.divIcon({
    className: 'custom-gps-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 34px; height: 34px; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 16px; height: 16px; background: #3b82f6; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 12px rgba(59, 130, 246, 0.6);"></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17]
  });

const MAP_STYLES = [
  { id: 'navigation-day', name: 'Mapbox Navigation Day', styleId: 'mapbox/navigation-day-v1' },
  { id: 'navigation-night', name: 'Mapbox Night Dark', styleId: 'mapbox/navigation-night-v1' },
  { id: 'streets', name: 'Mapbox Streets HD', styleId: 'mapbox/streets-v12' },
  { id: 'satellite', name: 'Mapbox Satellite Hybrid', styleId: 'mapbox/satellite-streets-v12' }
];

export const MapContainer = ({
  center = [6.4281, 3.4219],
  pickup = null,
  destination = null,
  routeCoordinates = null,
  drivers = [],
  activeDriverLocation = null,
  userLocation = null,
  sosEvents = [],
  height = '440px',
  interactive = true,
  onMapClick = null
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const layersRef = useRef([]);
  const [selectedStyle, setSelectedStyle] = useState('navigation-night');
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // Initialize Leaflet Map with Mapbox HD Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
        attributionControl: false
      });

      const styleObj = MAP_STYLES.find(s => s.id === selectedStyle) || MAP_STYLES[0];
      const tileUrl = MAPBOX_TOKEN
        ? `https://api.mapbox.com/styles/v1/${styleObj.styleId}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
        subdomains: 'abcd'
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      if (onMapClick) {
        map.on('click', (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
      }

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(center);
    }
  }, [center]);

  // Update Tile Layer when style changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const styleObj = MAP_STYLES.find(s => s.id === selectedStyle) || MAP_STYLES[0];
    const tileUrl = MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/${styleObj.styleId}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const newLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      tileSize: 512,
      zoomOffset: -1,
      subdomains: 'abcd'
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [selectedStyle]);

  // Update map click handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off('click');
    if (onMapClick) {
      map.on('click', (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    }
  }, [onMapClick]);

  // Render Markers, Road Polyline, and SOS layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    const bounds = L.latLngBounds();
    let hasPoints = false;

    // 1. User GPS Marker
    if (userLocation && userLocation.lat && userLocation.lng) {
      const gpsMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserGpsMarker()
      })
        .addTo(map)
        .bindPopup('<b>Your Live GPS Location</b>');
      layersRef.current.push(gpsMarker);
      bounds.extend([userLocation.lat, userLocation.lng]);
      hasPoints = true;
    }

    // 2. Pickup Marker
    if (pickup && pickup.lat && pickup.lng) {
      const pMarker = L.marker([pickup.lat, pickup.lng], {
        icon: createPickupMarker()
      })
        .addTo(map)
        .bindPopup(`<div style="font-size: 13px; font-weight: bold; color: #064e3b;">🟢 Pickup Point</div><div style="font-size: 11px; color: #374151;">${pickup.name || 'Selected Pickup'}</div>`);
      layersRef.current.push(pMarker);
      bounds.extend([pickup.lat, pickup.lng]);
      hasPoints = true;
    }

    // 3. Destination Marker
    if (destination && destination.lat && destination.lng) {
      const dMarker = L.marker([destination.lat, destination.lng], {
        icon: createDestMarker()
      })
        .addTo(map)
        .bindPopup(`<div style="font-size: 13px; font-weight: bold; color: #7f1d1d;">🔴 Destination</div><div style="font-size: 11px; color: #374151;">${destination.name || 'Selected Destination'}</div>`);
      layersRef.current.push(dMarker);
      bounds.extend([destination.lat, destination.lng]);
      hasPoints = true;
    }

    // 4. Real Road Polyline
    if (routeCoordinates && routeCoordinates.length > 1) {
      const glowLine = L.polyline(routeCoordinates, {
        color: '#10b981',
        weight: 9,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      const mainLine = L.polyline(routeCoordinates, {
        color: '#059669',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      layersRef.current.push(glowLine, mainLine);
      routeCoordinates.forEach((c) => bounds.extend(c));
      hasPoints = true;
    } else if (pickup && destination && pickup.lat && destination.lat) {
      const directLine = L.polyline(
        [
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng]
        ],
        { color: '#10b981', weight: 4, dashArray: '6, 8', opacity: 0.8 }
      ).addTo(map);
      layersRef.current.push(directLine);
    }

    // 5. Active Driver Marker
    if (activeDriverLocation && activeDriverLocation.lat && activeDriverLocation.lng) {
      const heading = activeDriverLocation.heading || 0;
      const actMarker = L.marker([activeDriverLocation.lat, activeDriverLocation.lng], {
        icon: createVehicleMarker(heading, activeDriverLocation.driverName || 'Driver')
      })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <div style="font-weight: 700; color: #0f172a;">🚖 ${activeDriverLocation.driverName || 'Your Driver'}</div>
            <div style="color: #64748b; font-size: 11px;">Speed: ${Math.round(activeDriverLocation.speed || 0)} km/h</div>
            <div style="color: #059669; font-size: 11px; font-weight: 600;">En Route via Mapbox Live GPS</div>
          </div>
        `);
      layersRef.current.push(actMarker);
      bounds.extend([activeDriverLocation.lat, activeDriverLocation.lng]);
      hasPoints = true;
    }

    // 6. Nearby Online Drivers
    if (drivers && drivers.length > 0) {
      drivers.forEach((d) => {
        const lat = d.latitude || d.lat;
        const lng = d.longitude || d.lng;
        if (!lat || !lng) return;

        const heading = d.heading || 0;
        const driverMarker = L.marker([lat, lng], {
          icon: createVehicleMarker(heading, d.firstName || 'Driver')
        })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; min-width: 140px;">
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${d.firstName || 'Driver'} ${d.lastName || ''}</div>
              <div style="color: #475569; font-size: 11px; margin-top: 2px;">
                🚗 ${d.vehicle?.make || 'Toyota'} ${d.vehicle?.model || 'Corolla'} (${d.vehicle?.plateNumber || 'LAG-123'})
              </div>
              <div style="color: #059669; font-weight: 600; font-size: 11px; margin-top: 4px;">
                ⭐ ${d.rating?.toFixed(1) || '5.0'} • ₦${d.pricing?.preferredFare?.toLocaleString() || '2,500'} base
              </div>
            </div>
          `);
        layersRef.current.push(driverMarker);
        bounds.extend([lat, lng]);
        hasPoints = true;
      });
    }

    // 7. Emergency SOS Alert Markers
    if (sosEvents && sosEvents.length > 0) {
      sosEvents.forEach((sos) => {
        if (!sos.latitude || !sos.longitude) return;
        const sosIcon = L.divIcon({
          className: 'sos-alert-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 44px; height: 44px; background: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 26px; height: 26px; background: #dc2626; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 16px rgba(220, 38, 38, 0.9); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 12px;">!</div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -22]
        });

        const sosMarker = L.marker([sos.latitude, sos.longitude], { icon: sosIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #991b1b;">
              <strong style="color: #dc2626; font-size: 13px;">🚨 EMERGENCY SOS ALERT</strong><br/>
              Status: <b>${sos.status || 'ACTIVE'}</b><br/>
              Type: ${sos.emergencyType || 'SOS_TRIGGERED'}<br/>
              Time: ${new Date(sos.createdAt).toLocaleTimeString()}
            </div>
          `);
        layersRef.current.push(sosMarker);
        bounds.extend([sos.latitude, sos.longitude]);
        hasPoints = true;
      });
    }

    if (hasPoints && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    }
  }, [pickup, destination, routeCoordinates, drivers, activeDriverLocation, userLocation, sosEvents]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-emerald-900/40 bg-slate-950">
      <div ref={mapContainerRef} style={{ width: '100%', height }} className="z-0" />

      {/* Top Left: Mapbox HD Layer Badge & Style Switcher */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="bg-slate-950/85 hover:bg-slate-900 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-bold text-white flex items-center gap-1.5 shadow-lg transition"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Map Style</span>
          </button>

          {showStyleMenu && (
            <div className="absolute top-full left-0 mt-2 bg-slate-950/95 border border-emerald-700/60 rounded-xl shadow-2xl overflow-hidden min-w-[170px] z-20">
              {MAP_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    setSelectedStyle(style.id);
                    setShowStyleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between border-b border-slate-800 last:border-none transition ${
                    selectedStyle === style.id ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{style.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Right: Live GPS Telemetry Indicator */}
      <div className="absolute top-3 right-3 z-10 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 shadow-lg pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>MAPBOX HD LIVE GPS</span>
      </div>

      {onMapClick && (
        <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/50 text-[11px] font-medium text-slate-300 shadow-lg pointer-events-none">
          💡 Click anywhere on the map to set location
        </div>
      )}
    </div>
  );
};
