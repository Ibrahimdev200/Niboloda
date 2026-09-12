import React from 'react';
import { ShieldCheck, Download, X, CheckCircle, Car, User } from 'lucide-react';

export const ReceiptModal = ({ isOpen, onClose, ride }) => {
  if (!isOpen || !ride) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg glass-panel bg-emerald-950 border border-emerald-700/60 rounded-3xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-emerald-900/50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Receipt Header */}
        <div className="text-center pb-4 border-b border-emerald-800/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-extrabold text-2xl shadow-lg mb-2">
            N
          </div>
          <h2 className="text-2xl font-extrabold font-outfit text-white tracking-wide">NIBOLODA</h2>
          <p className="text-[11px] text-emerald-400 font-medium">Official Digital Trip Receipt</p>
          <span className="inline-flex items-center gap-1 mt-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 text-amber-400" /> 0% PLATFORM COMMISSION
          </span>
        </div>

        {/* Fare Summary */}
        <div className="py-4 my-2 text-center bg-emerald-900/40 rounded-2xl border border-emerald-800/40">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Fare Paid</span>
          <div className="text-3xl font-extrabold text-amber-400 font-outfit mt-1">
            ₦{ride.agreedFare ? ride.agreedFare.toLocaleString() : '0'}
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3" /> Locked Agreed Fare at Booking
          </span>
        </div>

        {/* Commission Proof Breakdown */}
        <div className="space-y-2 text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800 mb-4">
          <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
            <span>Trip Base & Distance Fare</span>
            <span className="font-semibold text-white">₦{ride.agreedFare?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800 text-emerald-400 font-bold">
            <span>NIBOLODA Commission (0%)</span>
            <span>₦0.00</span>
          </div>
          <div className="flex justify-between py-1 text-amber-400 font-bold">
            <span>100% Driver Trip Earnings</span>
            <span>₦{ride.agreedFare?.toLocaleString()}</span>
          </div>
        </div>

        {/* Ride Details */}
        <div className="space-y-3 text-xs mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Pickup Location</div>
              <div className="font-medium text-white">{ride.pickupName}</div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 mt-1" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Destination</div>
              <div className="font-medium text-white">{ride.destName}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-800/40 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400">Driver:</span> {ride.driver?.firstName} {ride.driver?.lastName}
            </div>
            <div>
              <span className="text-slate-400">Vehicle:</span> {ride.driver?.vehicle?.make} {ride.driver?.vehicle?.model}
            </div>
            <div>
              <span className="text-slate-400">Plate Number:</span> {ride.driver?.vehicle?.plateNumber}
            </div>
            <div>
              <span className="text-slate-400">Distance:</span> {ride.distanceKm} km
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 bg-emerald-900/60 hover:bg-emerald-800/60 text-slate-300 font-semibold text-xs rounded-xl border border-emerald-700/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
