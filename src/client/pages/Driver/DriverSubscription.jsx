import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, CheckCircle2, ShieldCheck, Clock, ArrowLeft, Zap, Sparkles } from 'lucide-react';

export const DriverSubscription = ({ onBack }) => {
  const { token } = useAuth();
  
  const [plans, setPlans] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingPlanId, setSubmittingPlanId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch plans
      const plansRes = await fetch('/api/subscriptions/plans');
      const plansData = await plansRes.json();
      setPlans(plansData.plans || []);

      // Fetch active status
      const statusRes = await fetch('/api/subscriptions/my-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statusData = await statusRes.json();
      setActiveSubscription(statusData.subscription || null);
    } catch (err) {
      console.error('Fetch subscription data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setSubmittingPlanId(planId);
    setSuccessMessage('');

    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await res.json();
      if (res.ok && data.subscription) {
        setActiveSubscription(data.subscription);
        setSuccessMessage(`Subscription activated! ${data.message}`);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Subscribe error:', err);
    } finally {
      setSubmittingPlanId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-xs text-emerald-400 hover:text-white font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Driver Dashboard</span>
      </button>

      {/* Active Subscription Status Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase">DRIVER PLATFORM ACCESS</span>
            <h2 className="text-2xl font-extrabold text-white font-outfit mt-0.5">Subscription Hub</h2>
            <p className="text-xs text-slate-300">Pay a fixed subscription fee. Keep 100% of your passenger trip fares!</p>
          </div>

          <div className="flex items-center space-x-3">
            {activeSubscription ? (
              <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-3 rounded-2xl flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">ACTIVE: {activeSubscription.plan?.name}</div>
                  <div className="text-[10px] text-emerald-300">
                    Expires: {new Date(activeSubscription.expiryDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 p-3 rounded-2xl flex items-center space-x-3">
                <Clock className="w-6 h-6 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">NO ACTIVE SUBSCRIPTION</div>
                  <div className="text-[10px] text-amber-300">Subscribe to go online and receive rides</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="p-4 bg-emerald-900/60 border border-emerald-500/60 rounded-2xl text-emerald-300 text-xs font-bold animate-in fade-in">
            {successMessage}
          </div>
        )}
      </div>

      {/* Subscription Plans Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-white font-outfit">Choose Your Subscription Plan</h3>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs font-semibold">Loading subscription plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => {
              const isCurrent = activeSubscription?.planId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                    isCurrent
                      ? 'border-amber-400 bg-emerald-950/90 shadow-2xl shadow-amber-950/40'
                      : 'border-emerald-800/40 hover:border-emerald-600 bg-emerald-950/60'
                  }`}
                >
                  {plan.code === 'MONTHLY' && (
                    <span className="absolute top-4 right-4 bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      POPULAR
                    </span>
                  )}

                  <div className="space-y-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{plan.code} ACCESS</span>
                    <h4 className="text-xl font-extrabold text-white font-outfit">{plan.name}</h4>
                    <div className="text-3xl font-extrabold text-amber-400 font-outfit">
                      ₦{plan.price.toLocaleString()}
                      <span className="text-xs text-slate-400 font-normal"> / {plan.durationDays} days</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{plan.description}</p>

                    <div className="space-y-2 pt-3 border-t border-emerald-800/40 text-xs text-slate-300">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>0% Commission on all rides</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Driver controls pricing rules</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Unlimited passenger matching</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={submittingPlanId === plan.id}
                      className={`w-full py-3.5 rounded-2xl font-extrabold text-xs transition-all shadow-xl flex items-center justify-center space-x-2 ${
                        isCurrent
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>
                        {submittingPlanId === plan.id
                          ? 'Processing Paystack...'
                          : isCurrent
                          ? 'RENEW PLAN NOW'
                          : `SUBSCRIBE FOR ₦${plan.price.toLocaleString()}`}
                      </span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
