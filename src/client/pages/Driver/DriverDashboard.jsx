import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Power, Car, DollarSign, Star, Navigation, AlertCircle, CheckCircle, Clock, ShieldCheck, ArrowRight, Phone, Bell, Settings, CreditCard } from 'lucide-react';

export const DriverDashboard = ({ onOpenPricing, onOpenSubscription, onOpenOnboarding }) => {
  const { user, token } = useAuth();
  const { emitDriverLocation, activeRideUpdate } = useSocket();

  const [driverProfile, setDriverProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Active Ride & Request State
  const [activeRide, setActiveRide] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);

  // Fetch driver profile & check status
  useEffect(() => {
    fetchDriverProfile();
  }, [token]);

  const fetchDriverProfile = async () => {
    try {
      const res = await fetch('/api/drivers/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.driver) {
        setDriverProfile(data.driver);
        setIsOnline(data.driver.isOnline);
      }
    } catch (err) {
      console.error('Fetch driver error:', err);
    }
  };

  // Poll for incoming ride requests when ONLINE
  useEffect(() => {
    if (!isOnline || !driverProfile) return;

    const interval = setInterval(async () => {
      // Simulate location update to socket
      emitDriverLocation(driverProfile.id, 6.4281, 3.4219, 90, 30);

      // Check active or pending rides assigned to this driver
      try {
        const res = await fetch('/api/admin/rides', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const driverRides = (data.rides || []).filter(r => r.driverId === driverProfile.id);

        const pending = driverRides.find(r => r.status === 'REQUESTED');
        if (pending && !incomingRequest) {
          setIncomingRequest(pending);
        }

        const currentActive = driverRides.find(r => ['ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED'].includes(r.status));
        if (currentActive) {
          setActiveRide(currentActive);
        }
      } catch (err) {
        // silent catch
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOnline, driverProfile, incomingRequest, token]);

  const handleToggleOnline = async () => {
    setToggleLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/drivers/toggle-online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isOnline: !isOnline })
      });

      const data = await res.json();
      if (res.ok) {
        setIsOnline(data.isOnline);
      } else {
        setErrorMessage(data.error);
      }
    } catch (err) {
      setErrorMessage('Failed to update online status');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleRespondRequest = async (action) => {
    if (!incomingRequest) return;
    try {
      const res = await fetch(`/api/rides/${incomingRequest.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      if (action === 'ACCEPT') {
        setActiveRide(data.ride);
      }
      setIncomingRequest(null);
    } catch (err) {
      console.error('Respond error:', err);
    }
  };

  const handleRideStep = async (stepEndpoint) => {
    if (!activeRide) return;
    try {
      const res = await fetch(`/api/rides/${activeRide.id}/${stepEndpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ride) {
        if (data.ride.status === 'TRIP_COMPLETED') {
          setActiveRide(null);
          fetchDriverProfile();
        } else {
          setActiveRide(data.ride);
        }
      }
    } catch (err) {
      console.error('Trip step error:', err);
    }
  };

  const [showSensitiveWarning, setShowSensitiveWarning] = useState(false);

  const handleOpenSensitiveDocEdit = () => {
    if (driverProfile?.verificationStatus === 'APPROVED') {
      setShowSensitiveWarning(true);
    } else {
      onOpenOnboarding();
    }
  };

  const getVerificationBadge = () => {
    const status = driverProfile?.verificationStatus || 'PENDING_VERIFICATION';
    switch (status) {
      case 'APPROVED':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> ACCOUNT VERIFIED</span>;
      case 'UNDER_REVIEW':
      case 'PENDING_VERIFICATION':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-400" /> UNDER REVIEW</span>;
      case 'REJECTED':
        return <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-red-400" /> REJECTED</span>;
      case 'SUSPENDED':
        return <span className="bg-red-900/40 text-red-400 border border-red-700/60 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-red-500" /> SUSPENDED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      
      {/* Top Banner & Online Toggle */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-4">
            <img
              src={driverProfile?.profilePhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'}
              alt="Driver"
              className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white font-outfit">
                  {driverProfile ? `${driverProfile.firstName} ${driverProfile.lastName}` : 'Driver Portal'}
                </h1>
                {getVerificationBadge()}
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> 0% COMMISSION
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-300 mt-1">
                <span>Vehicle: <strong className="text-white">{driverProfile?.vehicle?.make || 'Toyota'} {driverProfile?.vehicle?.model || 'Corolla'}</strong></span>
                <span>•</span>
                <span>Plate: <strong className="text-amber-400 font-mono">{driverProfile?.vehicle?.plateNumber || 'ABC-123'}</strong></span>
              </div>
            </div>
          </div>

          {/* ONLINE / OFFLINE Switcher */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleOnline}
              disabled={toggleLoading}
              className={`px-6 py-3 rounded-2xl font-extrabold text-xs transition-all shadow-xl flex items-center space-x-2.5 ${
                isOnline
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-950 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Power className={`w-5 h-5 ${isOnline ? 'text-white' : 'text-slate-500'}`} />
              <span>{toggleLoading ? 'Updating Status...' : isOnline ? 'YOU ARE ONLINE' : 'GO ONLINE'}</span>
            </button>
          </div>

        </div>

        {/* Verification Alert Banner */}
        {driverProfile?.verificationStatus === 'REJECTED' && (
          <div className="p-4 bg-red-950/90 border border-red-700/60 rounded-2xl flex items-start space-x-3 text-xs text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-red-300">Verification Rejected</span>
              Reason: {driverProfile.rejectionReason || 'Uploaded documents did not pass verification.'} Please update your documents to request review again.
            </div>
          </div>
        )}

        {/* Error Blocker Message */}
        {errorMessage && (
          <div className="p-4 bg-red-950/90 border border-red-700/60 rounded-2xl flex items-start space-x-3 text-xs text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-red-300">Online Access Restricted</span>
              {errorMessage}
            </div>
          </div>
        )}
      </div>

      {/* Driver Quick Management Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={onOpenPricing}
          className="glass-panel p-4 rounded-2xl border border-emerald-800/40 hover:border-emerald-500/60 flex items-center justify-between text-left group transition-all"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Pricing Settings</h4>
              <p className="text-[11px] text-slate-400">Configure min fare & rate/km</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={onOpenSubscription}
          className="glass-panel p-4 rounded-2xl border border-emerald-800/40 hover:border-emerald-500/60 flex items-center justify-between text-left group transition-all"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Subscription Hub</h4>
              <p className="text-[11px] text-slate-400">Daily / Weekly / Monthly passes</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={handleOpenSensitiveDocEdit}
          className="glass-panel p-4 rounded-2xl border border-emerald-800/40 hover:border-emerald-500/60 flex items-center justify-between text-left group transition-all"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Verification Status</h4>
              <p className="text-[11px] text-slate-400">License, NIN & Vehicle docs</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Incoming Ride Request Popup Modal */}
      {incomingRequest && (
        <div className="glass-panel p-6 rounded-3xl border-2 border-amber-500 shadow-2xl bg-emerald-950/95 space-y-4 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <Bell className="w-4 h-4" /> NEW RIDE REQUEST
            </span>
            <span className="text-xl font-extrabold text-amber-400 font-outfit">
              AGREED FARE: ₦{incomingRequest.agreedFare?.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Passenger</span>
              <h4 className="font-bold text-white text-sm">
                {incomingRequest.passenger?.firstName} {incomingRequest.passenger?.lastName}
              </h4>
              <div className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {incomingRequest.passenger?.rating || 4.9} Rating
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Route Telemetry</span>
              <div className="text-xs text-slate-200">Distance: {incomingRequest.distanceKm} km</div>
              <div className="text-xs text-slate-200">Est. Duration: {incomingRequest.durationMin} mins</div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">Pickup:</span> <strong className="text-emerald-400">{incomingRequest.pickupName}</strong>
            </div>
            <div>
              <span className="text-slate-400">Destination:</span> <strong className="text-red-400">{incomingRequest.destName}</strong>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => handleRespondRequest('DECLINE')}
              className="flex-1 py-3 bg-red-900/60 hover:bg-red-800 text-red-200 font-bold text-xs rounded-xl border border-red-700/50"
            >
              DECLINE
            </button>
            <button
              onClick={() => handleRespondRequest('ACCEPT')}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950"
            >
              ACCEPT RIDE REQUEST
            </button>
          </div>
        </div>
      )}

      {/* Active Ride Navigation Workflow */}
      {activeRide && (
        <div className="glass-panel p-6 rounded-3xl border border-emerald-500/60 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase">ACTIVE TRIP NAVIGATION</span>
              <h3 className="text-xl font-extrabold text-white font-outfit">
                {activeRide.status === 'ACCEPTED' && 'Navigate to Pickup Point'}
                {activeRide.status === 'DRIVER_ARRIVING' && 'Navigating to Passenger...'}
                {activeRide.status === 'DRIVER_ARRIVED' && 'Waiting for Passenger to Board'}
                {activeRide.status === 'TRIP_STARTED' && 'Trip In Progress — Driving to Destination'}
              </h3>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Locked Agreed Fare</span>
              <div className="text-2xl font-extrabold text-amber-400 font-outfit">
                ₦{activeRide.agreedFare?.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="pt-2">
            {(activeRide.status === 'ACCEPTED' || activeRide.status === 'DRIVER_ARRIVING') && (
              <button
                onClick={() => handleRideStep('arrived')}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-xl tracking-wider"
              >
                I HAVE ARRIVED AT PICKUP LOCATION
              </button>
            )}

            {activeRide.status === 'DRIVER_ARRIVED' && (
              <button
                onClick={() => handleRideStep('start')}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl tracking-wider"
              >
                START TRIP NOW
              </button>
            )}

            {activeRide.status === 'TRIP_STARTED' && (
              <button
                onClick={() => handleRideStep('end')}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-xl tracking-wider"
              >
                END TRIP & COLLECT FARE (₦{activeRide.agreedFare?.toLocaleString()})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Driver Dashboard Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-emerald-800/40">
          <div className="text-xs font-semibold text-slate-400">Total Rides Completed</div>
          <div className="text-3xl font-extrabold text-white font-outfit mt-1">
            {driverProfile?.totalRides || 0}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-emerald-800/40">
          <div className="text-xs font-semibold text-slate-400">Driver Rating</div>
          <div className="text-3xl font-extrabold text-amber-400 font-outfit mt-1 flex items-center gap-1">
            <Star className="w-7 h-7 fill-amber-400" />
            {driverProfile?.rating || 5.0}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-emerald-800/40">
          <div className="text-xs font-semibold text-slate-400">NIBOLODA Commission</div>
          <div className="text-3xl font-extrabold text-emerald-400 font-outfit mt-1">
            0% (₦0)
          </div>
        </div>
      </div>

      {/* Sensitive Document Editing Warning Modal */}
      {showSensitiveWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-amber-500/50 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertCircle className="w-7 h-7 shrink-0" />
              <h3 className="text-lg font-extrabold text-white font-outfit">Re-Verification Warning</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your account is currently <strong className="text-emerald-400">VERIFIED & APPROVED</strong>. 
              Modifying sensitive documents (License, Vehicle Photo, Inspection Certificate, or Identity documents) will reset your status to <strong className="text-amber-400">UNDER REVIEW</strong> and require Admin re-approval before you can go online again.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-emerald-950">
              <button
                onClick={() => setShowSensitiveWarning(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowSensitiveWarning(false);
                  onOpenOnboarding();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg"
              >
                PROCEED TO EDIT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
