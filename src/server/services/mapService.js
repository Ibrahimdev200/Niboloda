/**
 * NIBOLODA Map & Geolocation Engine
 * Integrates Mapbox APIs (Geocoding, Reverse Geocoding, Directions with Live Traffic),
 * OpenStreetMap Nominatim / OSRM routing, and high-speed Nigerian landmark fallbacks.
 */

const { MAPBOX_ACCESS_TOKEN } = require('../config');

const NIGERIAN_LANDMARKS = [
  // Lagos
  { name: 'Victoria Island, Lagos', address: 'Victoria Island, Eti-Osa, Lagos State', lat: 6.4281, lng: 3.4219, city: 'Lagos' },
  { name: 'Ikeja City Mall, Alausa, Lagos', address: 'Obafemi Awolowo Way, Ikeja, Lagos State', lat: 6.6018, lng: 3.3515, city: 'Lagos' },
  { name: 'Lekki Phase 1, Lagos', address: 'Lekki Phase 1, Eti-Osa, Lagos State', lat: 6.4474, lng: 3.4723, city: 'Lagos' },
  { name: 'Murtala Muhammed International Airport (LOS)', address: 'Ikeja, Lagos State', lat: 6.5774, lng: 3.3210, city: 'Lagos' },
  { name: 'Yaba Tech, Yaba, Lagos', address: 'Herbert Macaulay Way, Yaba, Lagos State', lat: 6.5158, lng: 3.3718, city: 'Lagos' },
  { name: 'Surulere National Stadium, Lagos', address: 'Western Ave, Surulere, Lagos State', lat: 6.4975, lng: 3.3590, city: 'Lagos' },
  { name: 'Ajah Bus Stop, Lekki-Epe Expressway, Lagos', address: 'Ajah, Eti-Osa, Lagos State', lat: 6.4686, lng: 3.5654, city: 'Lagos' },
  { name: 'Maryland Mall, Ikorodu Road, Lagos', address: 'Ikorodu Road, Anthony, Lagos State', lat: 6.5683, lng: 3.3670, city: 'Lagos' },
  { name: 'Chevron Drive, Lekki, Lagos', address: 'Chevron Drive, Lekki Peninsula, Lagos State', lat: 6.4389, lng: 3.5350, city: 'Lagos' },
  { name: 'Oshodi Transport Interchange, Lagos', address: 'Agege Motor Rd, Oshodi, Lagos State', lat: 6.5542, lng: 3.3486, city: 'Lagos' },
  
  // Abuja FCT
  { name: 'Wuse 2, Abuja', address: 'Wuse 2, Federal Capital Territory, Abuja', lat: 9.0765, lng: 7.4695, city: 'Abuja' },
  { name: 'Maitama District, Abuja', address: 'Maitama, Federal Capital Territory, Abuja', lat: 9.0882, lng: 7.4983, city: 'Abuja' },
  { name: 'Nnamdi Azikiwe International Airport (ABV)', address: 'Airport Road, Abuja FCT', lat: 9.0068, lng: 7.2632, city: 'Abuja' },
  { name: 'Garki District Area 11, Abuja', address: 'Garki 2, Abuja FCT', lat: 9.0339, lng: 7.4870, city: 'Abuja' },
  { name: 'Jabi Lake Mall, Abuja', address: 'Bala Sokoto Way, Jabi, Abuja FCT', lat: 9.0722, lng: 7.4241, city: 'Abuja' },
  { name: 'Central Business District, Abuja', address: 'Constitution Ave, CBD, Abuja FCT', lat: 9.0579, lng: 7.4951, city: 'Abuja' },

  // Port Harcourt
  { name: 'GRA Phase 2, Port Harcourt', address: 'GRA Phase 2, Port Harcourt, Rivers State', lat: 4.8156, lng: 7.0003, city: 'Port Harcourt' },
  { name: 'Port Harcourt International Airport (PHC)', address: 'Omagwa, Port Harcourt, Rivers State', lat: 5.0155, lng: 6.9496, city: 'Port Harcourt' },
  { name: 'Trans Amadi Industrial Layout, Port Harcourt', address: 'Trans Amadi, Port Harcourt, Rivers State', lat: 4.8118, lng: 7.0375, city: 'Port Harcourt' },
  { name: 'Peter Odili Road, Trans Amadi, Port Harcourt', address: 'Peter Odili Road, Port Harcourt, Rivers State', lat: 4.8020, lng: 7.0420, city: 'Port Harcourt' }
];

// In-memory cache for fast lookups
const geocodeCache = new Map();
const routeCache = new Map();

/**
 * Calculates Haversine distance in KM between two lat/lng pairs
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates estimated travel duration in minutes based on distance & urban traffic
 */
function calculateEstimatedTime(distanceKm) {
  const avgSpeedKmH = 28;
  const timeHours = distanceKm / avgSpeedKmH;
  const minutes = Math.round(timeHours * 60) + 3;
  return Math.max(3, minutes);
}

/**
 * Live search locations with Mapbox Geocoding API + Nominatim & Landmark fallbacks
 */
async function searchLocations(query) {
  if (!query || query.trim() === '') {
    return NIGERIAN_LANDMARKS.slice(0, 6);
  }

  const cleanQuery = query.trim().toLowerCase();
  if (geocodeCache.has(cleanQuery)) {
    return geocodeCache.get(cleanQuery);
  }

  // 1. Try Mapbox Geocoding API
  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=ng&types=poi,address,neighborhood,place,locality&access_token=${MAPBOX_ACCESS_TOKEN}&limit=8`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(mapboxUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const results = data.features.map(f => {
            const [lng, lat] = f.center;
            const contextCity = f.context?.find(c => c.id.startsWith('place') || c.id.startsWith('region'))?.text || 'Nigeria';
            return {
              name: f.text || f.place_name.split(',')[0],
              address: f.place_name,
              lat,
              lng,
              city: contextCity,
              source: 'MAPBOX'
            };
          });

          geocodeCache.set(cleanQuery, results);
          return results;
        }
      }
    } catch (err) {
      // console.warn('Mapbox search fallback:', err.message);
    }
  }

  // 2. Check local landmarks
  const landmarkMatches = NIGERIAN_LANDMARKS.filter(l =>
    l.name.toLowerCase().includes(cleanQuery) ||
    l.address.toLowerCase().includes(cleanQuery) ||
    l.city.toLowerCase().includes(cleanQuery)
  );

  // 3. Query OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=ng&format=json&addressdetails=1&limit=8`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NIBOLODA-RideHailing/1.0 (contact@niboloda.ng)' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(item => ({
          name: item.name || item.display_name.split(',')[0],
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          city: item.address?.city || item.address?.state || 'Nigeria',
          source: 'NOMINATIM'
        }));

        const combined = [...landmarkMatches];
        for (const item of mapped) {
          if (!combined.some(c => Math.abs(c.lat - item.lat) < 0.002 && Math.abs(c.lng - item.lng) < 0.002)) {
            combined.push(item);
          }
        }

        const results = combined.slice(0, 8);
        geocodeCache.set(cleanQuery, results);
        return results;
      }
    }
  } catch (err) {
    // console.warn('Nominatim search fallback:', err.message);
  }

  const finalResults = landmarkMatches.length > 0 ? landmarkMatches : NIGERIAN_LANDMARKS.slice(0, 5);
  geocodeCache.set(cleanQuery, finalResults);
  return finalResults;
}

/**
 * Reverse Geocode Coordinates with Mapbox Reverse Geocoding API + Nominatim fallback
 */
async function reverseGeocode(lat, lng) {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  // 1. Try Mapbox Reverse Geocoding
  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(mapboxUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const f = data.features[0];
          const contextCity = f.context?.find(c => c.id.startsWith('place') || c.id.startsWith('region'))?.text || 'Nigeria';
          const result = {
            name: f.text || f.place_name.split(',')[0],
            address: f.place_name,
            lat,
            lng,
            city: contextCity,
            source: 'MAPBOX'
          };
          geocodeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      // console.warn('Mapbox reverse geocode fallback:', err.message);
    }
  }

  // 2. Check nearby landmark
  const nearbyLandmark = NIGERIAN_LANDMARKS.find(l => calculateHaversineDistance(lat, lng, l.lat, l.lng) < 0.5);
  if (nearbyLandmark) {
    return { name: nearbyLandmark.name, address: nearbyLandmark.address, lat, lng, source: 'LANDMARK' };
  }

  // 3. Fallback to Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NIBOLODA-RideHailing/1.0 (contact@niboloda.ng)' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const result = {
        name: data.name || data.display_name.split(',')[0],
        address: data.display_name,
        lat,
        lng,
        city: data.address?.city || data.address?.state || 'Nigeria',
        source: 'NOMINATIM'
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    // console.warn('Nominatim reverse geocode fallback:', err.message);
  }

  const fallback = {
    name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    address: `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}, Nigeria`,
    lat,
    lng,
    source: 'FALLBACK'
  };
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Fetch real driving route geometry with Mapbox Directions API (traffic aware) + OSRM fallback
 */
async function getRouteGeometry(lat1, lon1, lat2, lon2) {
  const cacheKey = `${lat1.toFixed(4)},${lon1.toFixed(4)}->${lat2.toFixed(4)},${lon2.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  // 1. Try Mapbox Driving Traffic Directions API
  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const mapboxDirectionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${lon1},${lat1};${lon2},${lat2}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(mapboxDirectionsUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
          const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
          const durationMin = Math.max(3, Math.round(route.duration / 60));

          const result = {
            coordinates,
            distanceKm,
            durationMin,
            source: 'MAPBOX_DIRECTIONS'
          };
          routeCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      // console.warn('Mapbox directions fallback:', err.message);
    }
  }

  // 2. Try OSRM Project Routing API
  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMin = Math.max(3, Math.round(route.duration / 60) + 3);

        const routeResult = {
          coordinates,
          distanceKm,
          durationMin,
          source: 'OSRM_ROUTING'
        };
        routeCache.set(cacheKey, routeResult);
        return routeResult;
      }
    }
  } catch (err) {
    // console.warn('OSRM routing fallback:', err.message);
  }

  // 3. Fallback Haversine road interpolation
  const straightDist = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  const duration = calculateEstimatedTime(straightDist);
  const steps = Math.max(8, Math.min(30, Math.round(straightDist * 3)));
  const interpolatedCoords = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curveOffset = Math.sin(t * Math.PI) * 0.003;
    const lat = lat1 + (lat2 - lat1) * t + curveOffset;
    const lng = lon1 + (lon2 - lon1) * t - curveOffset * 0.5;
    interpolatedCoords.push([lat, lng]);
  }

  const fallbackResult = {
    coordinates: interpolatedCoords,
    distanceKm: straightDist,
    durationMin: duration,
    source: 'HAVERSINE_INTERPOLATION'
  };

  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

module.exports = {
  MAPBOX_ACCESS_TOKEN,
  NIGERIAN_LANDMARKS,
  calculateHaversineDistance,
  calculateEstimatedTime,
  searchLocations,
  reverseGeocode,
  getRouteGeometry
};
