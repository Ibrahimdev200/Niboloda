import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { MapContainer } from '../../components/MapContainer';
import { Car, Star, Phone, MessageSquare, ShieldAlert, CheckCircle2, Clock, Award, ShieldCheck, Download } from 'lucide-react';
import confetti from 'canvas-confetti';

export const PassengerLiveRide = ({ ride: initialRide, onRideCompleted, onOpenReceipt }) => {
  const { token } = useAuth();
  const { activeRideUpdate, driverLocation } = useSocket();
  const [ride, setRide] = useState(initialRide);
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState(null);

  // Fetch real OSRM road geometry for the trip
  useEffect(() => {
    if (!ride?.pickupLat || !ride?.destLat) return;
    fetch('/api/locations/route-geometry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        destLat: ride.destLat,
        destLng: ride.destLng
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.coordinates) setRouteCoordinates(data.coordinates);
      })
      .catch(err => console.error('Trip route geometry error:', err));
  }, [ride?.pickupLat, ride?.destLat]);

  useEffect(() => {
    if (activeRideUpdate && activeRideUpdate.rideId === ride?.id) {
      setRide(prev => ({
        ...prev,
        status: activeRideUpdate.status,
        agreedFare: activeRideUpdate.agreedFare || prev.agreedFare
      }));

      if (activeRideUpdate.status === 'TRIP_COMPLETED') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
  }, [activeRideUpdate, ride?.id]);

  // Poll for status updates
  useEffect(() => {
    if (!ride?.id) return;
    const interval = setInterval(() => {
      fetch(`/api/rides/${ride.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.ride) {
            setRide(data.ride);
          }
        })
        .catch(err => console.error('Poll ride error:', err));
    }, 3000);

    return () => clearInterval(interval);
  }, [ride?.id, token]);

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/rides/${ride.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Cancelled by passenger' })
      });
      const data = await res.json();
      if (data.ride) {
        setRide(data.ride);
      }
    } catch (err) {
      console.error('Cancel ride error:', err);
    }
  };

  const handleSubmitRating = async () => {
    setSubmittingRating(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rideId: ride.id,
          ratingStars,
          reviewText
        })
      });
      const data = await res.json();
      if (data.rating) {
        setRatingSubmitted(true);
      }
    } catch (err) {
      console.error('Submit rating error:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  if (!ride) return null;

  const isCompleted = ride.status === 'TRIP_COMPLETED';
  const isCancelled = ride.status.includes('CANCELLED');

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      
      {/* Top Banner Status Stepper */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase">ACTIVE RIDE DISPATCH</span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> LOCKED FARE: ₦{ride.agreedFare?.toLocaleString()}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white font-outfit mt-1">
              {ride.status === 'REQUESTED' && 'Waiting for Driver Acceptance...'}
              {ride.status === 'ACCEPTED' && 'Driver Accepted Your Ride!'}
              {ride.status === 'DRIVER_ARRIVING' && 'Driver is Arriving at Pickup Point'}
              {ride.status === 'DRIVER_ARRIVED' && 'Driver Has Arrived at Pickup!'}
              {ride.status === 'TRIP_STARTED' && 'Trip In Progress'}
              {ride.status === 'TRIP_COMPLETED' && 'Trip Completed! Thank you for using NIBOLODA.'}
              {ride.status.includes('CANCELLED') && 'Ride Cancelled'}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {!isCompleted && !isCancelled && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-300 text-xs font-bold rounded-xl transition-all"
              >
                Cancel Trip
              </button>
            )}

            <button
              onClick={() => onOpenReceipt(ride)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-1 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Digital Receipt</span>
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {[
            { key: 'REQUESTED', label: 'Requested' },
            { key: 'ACCEPTED', label: 'Accepted' },
            { key: 'DRIVER_ARRIVED', label: 'Arrived' },
            { key: 'TRIP_STARTED', label: 'In Trip' },
            { key: 'TRIP_COMPLETED', label: 'Completed' }
          ].map((step, idx) => {
            const statuses = ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED'];
            const currentIdx = statuses.indexOf(ride.status);
            const stepIdx = statuses.indexOf(step.key);
            const isDone = currentIdx >= stepIdx;

            return (
              <div key={step.key} className="space-y-1 text-center">
                <div className={`h-2 rounded-full transition-all ${
                  isDone ? 'bg-emerald-500 shadow-md shadow-emerald-950' : 'bg-slate-800'
                }`} />
                <span className={`text-[10px] font-bold block ${isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Live Map + Driver Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-8 space-y-3">
          <MapContainer
            center={[ride.pickupLat, ride.pickupLng]}
            pickup={{ lat: ride.pickupLat, lng: ride.pickupLng, name: ride.pickupName }}
            destination={{ lat: ride.destLat, lng: ride.destLng, name: ride.destName }}
            routeCoordinates={routeCoordinates}
            activeDriverLocation={driverLocation}
            height="500px"
          />
        </div>

        {/* Driver Card & Rating View */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Driver Card */}
          <div className="glass-panel p-6 rounded-3xl border border-emerald-700/60 shadow-2xl space-y-4">
            <div className="flex items-center space-x-4">
              <img
                src={ride.driver?.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt="Driver"
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-lg"
              />
              <div>
                <h3 className="font-extrabold text-white text-lg font-outfit">{ride.driver?.firstName} {ride.driver?.lastName}</h3>
                <div className="flex items-center space-x-2 text-xs mt-0.5">
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {ride.driver?.rating || 4.9}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-400 font-semibold">{ride.driver?.totalRides || 50}+ Rides</span>
                </div>
                <div className="text-xs text-slate-300 font-medium mt-1">
                  {ride.driver?.vehicle?.make} {ride.driver?.vehicle?.model} ({ride.driver?.vehicle?.color})
                </div>
                <span className="inline-block bg-slate-800 text-amber-300 font-mono text-xs px-2 py-0.5 rounded border border-slate-700 font-bold mt-1">
                  {ride.driver?.vehicle?.plateNumber}
                </span>
              </div>
            </div>

            <div className="border-t border-emerald-800/40 pt-4 flex items-center justify-between">
              <a
                href={`tel:${ride.driver?.user?.phone || '+2348022220001'}`}
                className="flex-1 mr-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Phone className="w-4 h-4" />
                <span>Call Driver</span>
              </a>
              <button
                onClick={() => alert(`Chatting with driver ${ride.driver?.firstName}...`)}
                className="flex-1 py-2.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-700/50 flex items-center justify-center space-x-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>In-App Chat</span>
              </button>
            </div>
          </div>

          {/* Rating Section upon completion */}
          {isCompleted && (
            <div className="glass-panel p-6 rounded-3xl border border-amber-500/40 shadow-2xl space-y-4 animate-in fade-in">
              <div className="text-center">
                <Award className="w-10 h-10 text-amber-400 mx-auto mb-1 animate-bounce" />
                <h3 className="text-lg font-extrabold text-white font-outfit">Rate Your Experience</h3>
                <p className="text-xs text-slate-300">How was your trip with {ride.driver?.firstName}?</p>
              </div>

              {!ratingSubmitted ? (
                <div className="space-y-4">
                  {/* Star Rating selector */}
                  <div className="flex items-center justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRatingStars(star)}
                        className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star className={`w-8 h-8 ${star <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write a review about your driver..."
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 resize-none h-20"
                  />

                  <button
                    onClick={handleSubmitRating}
                    disabled={submittingRating}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg"
                  >
                    {submittingRating ? 'Submitting Review...' : 'SUBMIT DRIVER RATING'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <p className="font-bold text-sm text-white">Thank you for rating your driver!</p>
                  <p className="text-xs text-slate-400">Your feedback helps keep NIBOLODA safe and reliable.</p>
                  <button
                    onClick={onRideCompleted}
                    className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                  >
                    Back to Home Search
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
