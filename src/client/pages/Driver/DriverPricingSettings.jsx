import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, ShieldCheck, Save, Calculator, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const DriverPricingSettings = ({ onBack }) => {
  const { token } = useAuth();
  
  const [minFare, setMinFare] = useState(2000);
  const [preferredFare, setPreferredFare] = useState(2500);
  const [pricePerKm, setPricePerKm] = useState(250);
  const [pricePerMin, setPricePerMin] = useState(50);
  const [minDistance, setMinDistance] = useState(1);
  const [maxDistance, setMaxDistance] = useState(50);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/drivers/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.driver?.pricing) {
          const p = data.driver.pricing;
          setMinFare(p.minFare);
          setPreferredFare(p.preferredFare);
          setPricePerKm(p.pricePerKm);
          setPricePerMin(p.pricePerMin);
          setMinDistance(p.minDistance);
          setMaxDistance(p.maxDistance);
        }
      })
      .catch(err => console.error('Fetch pricing error:', err));
  }, [token]);

  // Live estimated trip price calculation for sample 10km / 20min trip
  const sampleKm = 10;
  const sampleMin = 20;
  const rawFare = preferredFare + (sampleKm * pricePerKm) + (sampleMin * pricePerMin);
  const calculatedFare = Math.round(Math.max(minFare, rawFare) / 100) * 100;

  const handleSavePricing = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/drivers/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          minFare,
          preferredFare,
          pricePerKm,
          pricePerMin,
          minDistance,
          maxDistance
        })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Save pricing error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-xs text-emerald-400 hover:text-white font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Driver Dashboard</span>
      </button>

      <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-emerald-800/40 pb-4">
          <div>
            <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase">DRIVER PRICING CONTROL</span>
            <h2 className="text-2xl font-extrabold text-white font-outfit mt-0.5">Configure Your Trip Pricing</h2>
            <p className="text-xs text-slate-300">NIBOLODA takes 0% commission. You keep 100% of the calculated fare.</p>
          </div>

          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> 0% Platform Commission
          </span>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-emerald-900/60 border border-emerald-500/60 rounded-2xl flex items-center space-x-2 text-emerald-300 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Pricing rules updated successfully! Your updated rates will now be displayed to passengers.</span>
          </div>
        )}

        <form onSubmit={handleSavePricing} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Minimum Fare */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Minimum Trip Fare (₦)</label>
              <input
                type="number"
                value={minFare}
                onChange={(e) => setMinFare(parseFloat(e.target.value) || 0)}
                className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-emerald-400"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Lowest total fare you will accept for any ride.</span>
            </div>

            {/* Preferred Starting Fare */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Preferred Base Fare (₦)</label>
              <input
                type="number"
                value={preferredFare}
                onChange={(e) => setPreferredFare(parseFloat(e.target.value) || 0)}
                className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-emerald-400"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Starting pickup base charge before distance/time.</span>
            </div>

            {/* Price Per Kilometer */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Price Per Kilometer (₦/KM)</label>
              <input
                type="number"
                value={pricePerKm}
                onChange={(e) => setPricePerKm(parseFloat(e.target.value) || 0)}
                className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-emerald-400"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Charged per kilometer traveled on route.</span>
            </div>

            {/* Price Per Minute */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Price Per Minute (₦/Min)</label>
              <input
                type="number"
                value={pricePerMin}
                onChange={(e) => setPricePerMin(parseFloat(e.target.value) || 0)}
                className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-emerald-400"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Charged for estimated trip duration.</span>
            </div>

            {/* Min Distance */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Minimum Service Distance (KM)</label>
              <input
                type="number"
                value={minDistance}
                onChange={(e) => setMinDistance(parseFloat(e.target.value) || 0)}
                className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-emerald-400"
              />
            </div>

            {/* Max Distance */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Maximum Service Distance (KM)</label>
              <input
                type="number"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseFloat(e.target.value) || 0)}
                className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-sm text-white font-bold outline-none focus:border-emerald-400"
              />
            </div>

          </div>

          {/* Price Preview Card */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400">
              <Calculator className="w-5 h-5" />
              <h4 className="font-extrabold text-sm text-white">Live Fare Preview (10 KM / 20 Mins Trip)</h4>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-300">Base Fare (₦{preferredFare}) + 10 KM (₦{10 * pricePerKm}) + 20 Mins (₦{20 * pricePerMin})</span>
              <span className="text-2xl font-extrabold text-amber-400 font-outfit">₦{calculatedFare.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-xl flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving Pricing Rules...' : 'SAVE & APPLY PRICING RULES'}</span>
          </button>

        </form>
      </div>

    </div>
  );
};
