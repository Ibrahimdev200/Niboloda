import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Bookmark, Car, Clock3, MapPin, Navigation, Plus, ReceiptText, Star, WalletCards } from 'lucide-react';

const activeStatuses = ['REQUESTED', 'ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED'];

export const PassengerDashboard = ({ onBookRide, onResumeRide }) => {
  const { user, token } = useAuth();
  const [rides, setRides] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/passengers/rides', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch('/api/passengers/saved-locations', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ])
      .then(([rideData, locationData]) => {
        setRides(rideData.rides || []);
        setSavedLocations(locationData.locations || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const activeRide = useMemo(() => rides.find(ride => activeStatuses.includes(ride.status)), [rides]);
  const completedRides = rides.filter(ride => ride.status === 'TRIP_COMPLETED');
  const totalSpent = completedRides.reduce((sum, ride) => sum + (ride.agreedFare || 0), 0);
  const firstName = user?.passenger?.firstName || 'there';

  return (
    <section className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 px-6 py-7 shadow-2xl shadow-emerald-950/50 sm:px-8">
        <div className="pointer-events-none absolute -right-14 -top-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-extrabold tracking-[.18em] text-emerald-200">PASSENGER DASHBOARD</p>
            <h1 className="mt-2 font-outfit text-3xl font-extrabold text-white sm:text-4xl">Good to see you, {firstName}.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/80">Choose your driver, agree on the fare before you travel, and keep every trip in one place.</p>
          </div>
          <button onClick={onBookRide} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-xs font-extrabold text-emerald-950 shadow-lg shadow-black/20 transition hover:bg-amber-300">
            <Plus className="h-4 w-4" /> BOOK A RIDE <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeRide && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400 text-emerald-950"><Navigation className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-extrabold tracking-wider text-amber-300">ACTIVE TRIP</p>
              <p className="mt-1 text-sm font-bold text-white">{activeRide.pickupName} <span className="text-slate-400">to</span> {activeRide.destName}</p>
              <p className="mt-1 text-xs text-slate-300">Status: {activeRide.status.replaceAll('_', ' ')} · Locked fare ₦{activeRide.agreedFare?.toLocaleString()}</p>
            </div>
          </div>
          <button onClick={() => onResumeRide(activeRide)} className="rounded-xl border border-amber-300/40 px-4 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-400 hover:text-emerald-950">VIEW LIVE RIDE</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Car className="h-5 w-5" />} label="Completed rides" value={loading ? '—' : completedRides.length} tone="emerald" />
        <Stat icon={<WalletCards className="h-5 w-5" />} label="Total ride value" value={loading ? '—' : `₦${totalSpent.toLocaleString()}`} tone="amber" />
        <Stat icon={<Star className="h-5 w-5" />} label="Passenger rating" value={user?.passenger?.rating || '5.0'} tone="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[.84fr_1.16fr]">
        <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-6">
          {/* Emergency Contact Box */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold tracking-wider text-emerald-400">EMERGENCY CONTACT</p>
                <h2 className="mt-1 font-outfit text-lg font-extrabold text-white">Safety First</h2>
              </div>
              <ShieldCheck className="h-5 w-5 text-amber-400" />
            </div>
            {user?.passenger?.emergencyContact ? (
              <div className="mt-4 rounded-xl border border-emerald-800/55 bg-emerald-950/40 p-4 text-xs space-y-1">
                <p className="font-bold text-white text-sm">{user.passenger.emergencyContact.name}</p>
                <p className="text-slate-300">Phone: <span className="text-amber-300 font-mono">{user.passenger.emergencyContact.phone}</span></p>
                <p className="text-slate-400">Relationship: {user.passenger.emergencyContact.relationship}</p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400 italic">No emergency contact saved yet.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div><p className="text-[10px] font-extrabold tracking-wider text-emerald-400">SAVED PLACES</p><h2 className="mt-1 font-outfit text-lg font-extrabold text-white">Start from somewhere familiar</h2></div>
              <Bookmark className="h-5 w-5 text-amber-400" />
            </div>
            <div className="mt-5 space-y-3">
              {loading ? <p className="text-xs text-slate-500">Loading your places…</p> : savedLocations.length ? savedLocations.slice(0, 4).map(place => (
                <button key={place.id} onClick={onBookRide} className="flex w-full items-center gap-3 rounded-xl border border-emerald-800/55 bg-emerald-950/35 p-3 text-left transition hover:border-emerald-500/55 hover:bg-emerald-900/35">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400"><MapPin className="h-4 w-4" /></span>
                  <span><span className="block text-xs font-bold text-white">{place.label || place.name}</span><span className="mt-0.5 block text-[11px] text-slate-400 truncate max-w-[13rem]">{place.address || place.name}</span></span>
                </button>
              )) : <p className="rounded-xl border border-dashed border-emerald-800/70 p-4 text-xs leading-5 text-slate-400">Your home and work locations will appear here once saved.</p>}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-extrabold tracking-wider text-emerald-400">RECENT ACTIVITY</p><h2 className="mt-1 font-outfit text-lg font-extrabold text-white">Your trips</h2></div><ReceiptText className="h-5 w-5 text-emerald-400" /></div>
          <div className="mt-5 space-y-3">
            {loading ? <p className="text-xs text-slate-500">Loading your ride history…</p> : rides.length ? rides.slice(0, 4).map(ride => (
              <div key={ride.id} className="flex items-center gap-3 rounded-xl border border-emerald-800/45 bg-emerald-950/30 p-3.5">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${ride.status === 'TRIP_COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}><Clock3 className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{ride.pickupName} → {ride.destName}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(ride.createdAt).toLocaleDateString()} · {ride.status.replaceAll('_', ' ')}</p></div>
                <strong className="text-xs text-amber-400">₦{ride.agreedFare?.toLocaleString()}</strong>
              </div>
            )) : <p className="rounded-xl border border-dashed border-emerald-800/70 p-5 text-center text-xs text-slate-400">Your completed and active rides will appear here.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};

const Stat = ({ icon, label, value, tone }) => (
  <div className="glass-panel rounded-2xl p-5"><div className={`grid h-10 w-10 place-items-center rounded-xl ${tone === 'amber' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{icon}</div><p className="mt-4 text-[11px] font-semibold text-slate-400">{label}</p><p className="mt-1 font-outfit text-2xl font-extrabold text-white">{value}</p></div>
);
