import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MapContainer } from '../../components/MapContainer';
import { Search, MapPin, Navigation, Star, Car, Clock, ArrowRight, ArrowLeft, ShieldCheck, Filter, Home, Briefcase, RefreshCw, CheckCircle2, LocateFixed, Bookmark, AlertCircle } from 'lucide-react';

export const PassengerHome = ({ onRideRequested, onOpenReceipt, onBack }) => {
  const { user, token } = useAuth();
  
  // Locations
  const [pickupText, setPickupText] = useState('Victoria Island, Lagos');
  const [pickupCoords, setPickupCoords] = useState({ lat: 6.4281, lng: 3.4219 });

  const [destText, setDestText] = useState('');
  const [destCoords, setDestCoords] = useState(null);

  // Search Results
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Driver Comparison
  const [drivers, setDrivers] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [sortBy, setSortBy] = useState('LOWEST_PRICE'); // LOWEST_PRICE, CLOSEST_DRIVER, HIGHEST_RATING, FASTEST_ARRIVAL
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [requestingRide, setRequestingRide] = useState(false);
  const [savedLocations, setSavedLocations] = useState([]);
  const [locationMessage, setLocationMessage] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Real OSRM Road Polyline
  const [routeCoordinates, setRouteCoordinates] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/passengers/saved-locations', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setSavedLocations(data.locations || []))
      .catch(() => setSavedLocations([]));
  }, [token]);

  // Location suggestions search handler
  const handleSearchSuggestions = async (val) => {
    setDestText(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/locations/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSearchResults(data.locations || []);
    } catch (err) {
      console.error('Location search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectDestination = (location) => {
    setDestText(location.name);
    const coords = { lat: location.lat, lng: location.lng };
    setDestCoords(coords);
    setSearchResults([]);
    fetchRouteGeometry(pickupCoords, coords);
    findNearbyDrivers(coords, sortBy);
  };

  // Map Click handler (Auto reverse geocode)
  const handleMapClick = async ({ lat, lng }) => {
    try {
      const res = await fetch(`/api/locations/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      const placeName = data.location?.name || `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;

      if (!destCoords) {
        setDestText(placeName);
        const nextDest = { lat, lng };
        setDestCoords(nextDest);
        fetchRouteGeometry(pickupCoords, nextDest);
        findNearbyDrivers(nextDest, sortBy);
      } else {
        setPickupText(placeName);
        const nextPickup = { lat, lng };
        setPickupCoords(nextPickup);
        fetchRouteGeometry(nextPickup, destCoords);
        findNearbyDrivers(destCoords, sortBy);
      }
    } catch (err) {
      console.error('Map click reverse geocode error:', err);
    }
  };

  // Fetch real OSRM road geometry
  const fetchRouteGeometry = async (pCoords, dCoords) => {
    if (!pCoords || !dCoords) return;
    try {
      const res = await fetch('/api/locations/route-geometry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupLat: pCoords.lat,
          pickupLng: pCoords.lng,
          destLat: dCoords.lat,
          destLng: dCoords.lng
        })
      });
      const data = await res.json();
      if (data.coordinates) {
        setRouteCoordinates(data.coordinates);
        setRouteInfo({
          distanceKm: data.distanceKm,
          durationMin: data.durationMin
        });
      }
    } catch (err) {
      console.error('Route geometry error:', err);
    }
  };

  const useCurrentLocation = () => {
    setLocationMessage('Finding your location…');
    if (!navigator.geolocation) {
      setLocationMessage('Location is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextPickup = { lat: coords.latitude, lng: coords.longitude };
        setPickupCoords(nextPickup);
        try {
          const res = await fetch(`/api/locations/reverse-geocode?lat=${coords.latitude}&lng=${coords.longitude}`);
          const data = await res.json();
          setPickupText(data.location?.name || 'Current GPS Location');
        } catch (e) {
          setPickupText('Current GPS Location');
        }
        setLocationMessage('Current GPS location active.');
        if (destCoords) {
          fetchRouteGeometry(nextPickup, destCoords);
          findNearbyDrivers(destCoords, sortBy);
        }
      },
      () => setLocationMessage('We could not access your location. Check browser permissions.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const selectSavedLocation = (location) => {
    const place = { name: location.name || location.address, lat: location.latitude, lng: location.longitude };
    setPickupText(place.name);
    const nextPickup = { lat: place.lat, lng: place.lng };
    setPickupCoords(nextPickup);
    setLocationMessage(`${location.label || 'Saved place'} selected.`);
    if (destCoords) {
      fetchRouteGeometry(nextPickup, destCoords);
      findNearbyDrivers(destCoords, sortBy);
    }
  };

  const findNearbyDrivers = async (targetDestCoords = destCoords, currentSort = sortBy) => {
    if (!targetDestCoords) return;
    setLoadingDrivers(true);

    try {
      const res = await fetch('/api/rides/search-drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          destLat: targetDestCoords.lat,
          destLng: targetDestCoords.lng,
          sortBy: currentSort
        })
      });

      const data = await res.json();
      if (!routeInfo || !routeCoordinates) {
        setRouteInfo({
          distanceKm: data.routeDistanceKm,
          durationMin: data.routeDurationMin
        });
      }
      setDrivers(data.drivers || []);
      if (data.drivers && data.drivers.length > 0) {
        setSelectedDriverId(data.drivers[0].driverId);
      }
    } catch (err) {
      console.error('Driver search error:', err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    if (destCoords) {
      findNearbyDrivers(destCoords, newSort);
    }
  };

  const handleConfirmBooking = async () => {
    const selectedDriver = drivers.find(d => d.driverId === selectedDriverId);
    if (!selectedDriver || !destCoords) return;

    setRequestingRide(true);
    setBookingError('');
    try {
      const res = await fetch('/api/rides/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          driverId: selectedDriver.driverId,
          pickupName: pickupText,
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          destName: destText,
          destLat: destCoords.lat,
          destLng: destCoords.lng,
          distanceKm: routeInfo.distanceKm,
          durationMin: routeInfo.durationMin,
          agreedFare: selectedDriver.calculatedFare,
          paymentMethod: 'CARD'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ride) {
        throw new Error(data.error || 'We could not create your ride request.');
      }
      if (data.ride) {
        onRideRequested(data.ride);
      }
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError(err.message || 'We could not create your ride request.');
    } finally {
      setRequestingRide(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {onBack && <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</button>}
      
      {/* Top Banner: Where Are You Going */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase">NIBOLODA Marketplace</span>
            <h1 className="text-3xl font-extrabold text-white font-outfit mt-0.5">Where are you going?</h1>
            <p className="text-xs text-slate-300">Set your trip destination. Verified drivers offer their prices — you choose!</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSelectDestination({ name: 'Ikeja City Mall, Lagos', lat: 6.6018, lng: 3.3515 })}
              className="bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/50 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1 text-emerald-300"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Ikeja Mall</span>
            </button>
            <button
              onClick={() => handleSelectDestination({ name: 'Lekki Phase 1, Lagos', lat: 6.4474, lng: 3.4723 })}
              className="bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/50 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1 text-emerald-300"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Lekki Phase 1</span>
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Pickup Input */}
          <div className="relative">
            <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Pickup Location</label>
            <div className="flex items-center bg-emerald-950/80 border border-emerald-700/60 rounded-2xl px-3.5 py-3 text-sm text-white focus-within:border-emerald-500">
              <MapPin className="w-5 h-5 text-emerald-400 mr-2 shrink-0" />
              <input
                type="text"
                value={pickupText}
                onChange={(e) => setPickupText(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-sm font-medium"
                placeholder="Enter pickup address..."
              />
              <button
                onClick={useCurrentLocation}
                title="Current GPS Location"
                className="p-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300 rounded-lg text-xs"
              >
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Destination Input */}
          <div className="relative">
            <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Destination</label>
            <div className="flex items-center bg-emerald-950/80 border border-emerald-700/60 rounded-2xl px-3.5 py-3 text-sm text-white focus-within:border-emerald-500">
              <Search className="w-5 h-5 text-amber-400 mr-2 shrink-0" />
              <input
                type="text"
                value={destText}
                onChange={(e) => handleSearchSuggestions(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-sm font-medium"
                placeholder="Where to? (e.g. Ikeja, Lekki, Wuse 2, PH GRA)"
              />
            </div>

            {/* Dropdown Suggestions */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-emerald-950 border border-emerald-700/80 rounded-2xl shadow-2xl overflow-hidden z-30">
                {searchResults.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectDestination(loc)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-900/60 text-xs border-b border-emerald-900/40 last:border-none flex items-center justify-between text-slate-200"
                  >
                    <div>
                      <div className="font-bold text-white">{loc.name}</div>
                      <div className="text-[10px] text-emerald-400">{loc.city}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={useCurrentLocation} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-900/40 px-3 py-2 text-[11px] font-bold text-emerald-200 hover:bg-emerald-800/60">
            <LocateFixed className="h-3.5 w-3.5" /> Use current location
          </button>
          {savedLocations.slice(0, 3).map(location => (
            <button key={location.id} onClick={() => selectSavedLocation(location)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/70 bg-emerald-950/50 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:border-emerald-600 hover:text-white">
              <Bookmark className="h-3.5 w-3.5 text-amber-400" /> {location.label || location.name}
            </button>
          ))}
          {locationMessage && <span className="text-[11px] text-emerald-300">{locationMessage}</span>}
        </div>
      </div>

      {/* Main Grid: Interactive Map + Driver Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Map View */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-emerald-400" /> Live Interactive Map
            </h3>
            {routeInfo && (
              <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                Distance: {routeInfo.distanceKm} km | Est. Duration: {routeInfo.durationMin} mins
              </span>
            )}
          </div>

          <MapContainer
            center={[pickupCoords.lat, pickupCoords.lng]}
            pickup={pickupCoords}
            destination={destCoords}
            routeCoordinates={routeCoordinates}
            drivers={drivers}
            onMapClick={handleMapClick}
            height="480px"
          />
        </div>

        {/* Driver Comparison List */}
        <div className="lg:col-span-6 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-800/40 pb-3">
            <div>
              <h3 className="text-lg font-extrabold text-white font-outfit flex items-center gap-2">
                Available Drivers ({drivers.length})
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  0% Commission
                </span>
              </h3>
              <p className="text-xs text-slate-400">Drivers set their price. Compare and select your driver.</p>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center bg-emerald-950 p-1 rounded-xl border border-emerald-800/60 overflow-x-auto">
              {[
                { id: 'LOWEST_PRICE', label: 'Lowest Price' },
                { id: 'CLOSEST_DRIVER', label: 'Closest' },
                { id: 'HIGHEST_RATING', label: 'Rating' },
                { id: 'FASTEST_ARRIVAL', label: 'Fastest ETA' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleSortChange(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                    sortBy === tab.id
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Driver List */}
          {loadingDrivers ? (
            <div className="glass-panel p-12 rounded-3xl text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs font-semibold">Finding verified online drivers & calculating custom fares...</p>
            </div>
          ) : !destCoords ? (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
              <Search className="w-10 h-10 text-emerald-400/60 mx-auto" />
              <h4 className="text-base font-bold text-white">Enter a destination to compare nearby drivers</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                NIBOLODA displays verified, online, subscribed drivers with their preferred trip pricing for your review.
              </p>
            </div>
          ) : drivers.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl text-center text-slate-300">
              <Car className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="font-bold text-sm">No drivers currently online within your search radius.</p>
              <p className="text-xs text-slate-400 mt-1">Try expanding your search radius in Admin or select another pickup location.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {drivers.map(driver => {
                const isSelected = selectedDriverId === driver.driverId;
                return (
                  <div
                    key={driver.driverId}
                    onClick={() => setSelectedDriverId(driver.driverId)}
                    className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'driver-card-selected border-emerald-500 bg-emerald-950/90'
                        : 'border-emerald-800/40 hover:border-emerald-600/60 bg-emerald-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Driver Avatar & Info */}
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src={driver.driverPhoto}
                            alt={driver.driverName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/60 shadow-md"
                          />
                          <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-extrabold text-white text-sm">{driver.driverName}</h4>
                            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {driver.rating}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 flex items-center space-x-2 mt-0.5">
                            <span className="font-semibold text-emerald-400">{driver.vehicle.make} {driver.vehicle.model}</span>
                            <span className="text-slate-500">•</span>
                            <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700">
                              {driver.vehicle.plateNumber}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                            <span>{driver.completedRides} rides</span>
                            <span>•</span>
                            <span>{driver.distanceToPickupKm} km away</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">{driver.etaToPickupMin} min ETA</span>
                          </div>
                        </div>
                      </div>

                      {/* Driver Price Card & Select Button */}
                      <div className="text-right shrink-0">
                        <div className="text-xs text-slate-400 font-medium">Driver's Price</div>
                        <div className="text-2xl font-extrabold text-amber-400 font-outfit tracking-tight">
                          ₦{driver.calculatedFare.toLocaleString()}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDriverId(driver.driverId);
                            setBookingError('');
                          }}
                          className={`mt-2 px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center justify-center space-x-1 ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-950'
                              : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50'
                          }`}
                        >
                          <span>{isSelected ? 'SELECTED' : 'SELECT'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedDriverId && destCoords && !loadingDrivers && (() => {
            const selectedDriver = drivers.find(driver => driver.driverId === selectedDriverId);
            if (!selectedDriver) return null;
            return (
              <div className="rounded-2xl border border-emerald-500/45 bg-emerald-900/30 p-4 shadow-lg shadow-emerald-950/30 animate-in fade-in">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold tracking-wider text-emerald-400">READY TO BOOK</p>
                    <p className="mt-1 text-sm font-bold text-white">{selectedDriver.driverName} · <span className="text-amber-400">₦{selectedDriver.calculatedFare.toLocaleString()}</span></p>
                    <p className="mt-1 text-[11px] text-slate-400">Your price is shown before the request is sent.</p>
                  </div>
                  <button onClick={handleConfirmBooking} disabled={requestingRide} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/60 hover:from-emerald-400 hover:to-emerald-500">
                    {requestingRide ? 'SENDING REQUEST…' : 'CONFIRM RIDE'} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {bookingError && <p className="mt-3 flex items-center gap-1.5 text-xs text-red-300"><AlertCircle className="h-4 w-4" /> {bookingError}</p>}
              </div>
            );
          })()}

        </div>

      </div>

    </div>
  );
};
