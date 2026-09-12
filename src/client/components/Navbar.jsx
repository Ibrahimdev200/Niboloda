import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Car, UserCheck, ShieldAlert, LogOut, Phone, ShieldCheck, Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';

export const Navbar = ({ onOpenSOS, onAccess }) => {
  const { user, logout, activePortal, setActivePortal } = useAuth();
  const canAccess = (portal) => {
    if (!user) return portal === 'PASSENGER';
    if (portal === 'ADMIN') return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    return user.role === portal;
  };

  const openPortal = (portal) => {
    if (canAccess(portal)) setActivePortal(portal);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-700/30 bg-emerald-950/85 backdrop-blur-xl px-3 sm:px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,.12)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand Logo & Tagline */}
        <button className="flex items-center space-x-3 text-left shrink-0 group" onClick={() => openPortal('PASSENGER')} aria-label="Open passenger portal">
          <div className="h-11 w-11 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-500/30 group-hover:scale-105 transition-transform bg-black/40">
            <img src="/niboloda-logo.png" alt="NIBOLODA Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-2xl tracking-tight font-outfit">
                <span className="text-white">NIBO</span><span className="text-emerald-400">LODA</span>
              </span>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" /> 0% COMMISSION
              </span>
            </div>
            <p className="text-[11px] text-emerald-300 font-medium hidden sm:block">
              Drivers Set the Price. Passengers Choose the Ride.
            </p>
          </div>
        </button>

        {/* Navigation Portal Switcher Tabs */}
        {user && <div className="hidden md:flex items-center space-x-1 bg-emerald-900/50 p-1 rounded-xl border border-emerald-700/40">
          <button
            onClick={() => openPortal('PASSENGER')}
            disabled={!canAccess('PASSENGER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePortal === 'PASSENGER'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-emerald-800/40'
            }`}
          >
            Passenger App
          </button>
          <button
            onClick={() => openPortal('DRIVER')}
            disabled={!canAccess('DRIVER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePortal === 'DRIVER'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-emerald-800/40'
            }`}
          >
            Driver App
          </button>
          <button
            onClick={() => openPortal('ADMIN')}
            disabled={!canAccess('ADMIN')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activePortal === 'ADMIN'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-emerald-800/40'
            }`}
          >
            Admin Dashboard
          </button>
        </div>}

        {/* Right Section: Quick Demo Login & SOS */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {!user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={() => onAccess('login')} className="px-3 py-2 text-xs font-bold text-emerald-200 hover:text-white">Sign in</button>
              <button onClick={() => onAccess('register')} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-400">Get started</button>
            </div>
          ) : <span className="hidden lg:block rounded-lg border border-emerald-700/50 bg-emerald-900/35 px-3 py-2 text-[10px] font-bold text-emerald-200">{user.role}</span>}

          {user && <button
            onClick={onOpenSOS}
            className="flex items-center space-x-1.5 bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-lg shadow-red-950/60 animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden sm:inline">SOS EMERGENCY</span>
          </button>}

          {user && (
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-emerald-900/40 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

        </div>

      </div>

      {user && <div className="max-w-7xl mx-auto mt-3 md:hidden flex gap-1 rounded-xl border border-emerald-700/30 bg-emerald-950/60 p-1 overflow-x-auto">
        {[
          { id: 'PASSENGER', label: 'Passenger' },
          { id: 'DRIVER', label: 'Driver' },
          { id: 'ADMIN', label: 'Admin' }
        ].map((portal) => (
          <button
            key={portal.id}
            type="button"
            disabled={!canAccess(portal.id)}
            onClick={() => openPortal(portal.id)}
            className={`min-w-[6.5rem] flex-1 rounded-lg px-3 py-2 text-[11px] font-bold transition-all ${
              activePortal === portal.id
                ? portal.id === 'ADMIN' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:bg-emerald-900/70 hover:text-white disabled:text-slate-600'
            }`}
          >
            {portal.label}
          </button>
        ))}
      </div>}
    </header>
  );
};
