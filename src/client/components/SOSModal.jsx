import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, AlertTriangle, PhoneCall, CheckCircle, X } from 'lucide-react';

export const SOSModal = ({ isOpen, onClose, rideId = null }) => {
  const { user } = useAuth();
  const { triggerSOS } = useSocket();
  const [emergencyType, setEmergencyType] = useState('SECURITY_THREAT');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSendSOS = async () => {
    // Current simulated GPS coordinates
    const lat = 6.4281;
    const lng = 3.4219;

    triggerSOS(user ? user.id : 'anonymous', rideId, lat, lng, emergencyType);

    try {
      await fetch('/api/emergency/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('niboloda_token')}`
        },
        body: JSON.stringify({
          rideId,
          latitude: lat,
          longitude: lng,
          emergencyType
        })
      });
    } catch (err) {
      console.error('SOS dispatch error:', err);
    }

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md glass-panel bg-red-950/90 border border-red-700/60 rounded-3xl p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-red-900/40"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center space-x-3 mb-4 text-red-400">
              <div className="p-3 rounded-2xl bg-red-600/20 border border-red-500/30">
                <ShieldAlert className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-outfit text-white">EMERGENCY SOS ALERT</h3>
                <p className="text-xs text-red-300">Instant dispatch to NIBOLODA Security Command</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Pressing SOS will broadcast your current GPS coordinates to our 24/7 security dispatch team, active ride participants, and Nigerian emergency responders.
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-xs font-semibold text-red-200">Select Emergency Type:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'SECURITY_THREAT', label: 'Security Threat' },
                  { id: 'ACCIDENT', label: 'Vehicle Accident' },
                  { id: 'MEDICAL_EMERGENCY', label: 'Medical Event' },
                  { id: 'HARASSMENT', label: 'Harassment / Fraud' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setEmergencyType(type.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                      emergencyType === type.id
                        ? 'bg-red-600 border-red-400 text-white shadow-md'
                        : 'bg-red-900/40 border-red-800/60 text-red-200 hover:bg-red-900/70'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <a
                href="tel:112"
                className="flex-1 py-3 bg-red-900/80 hover:bg-red-900 border border-red-700 text-red-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call 112 National Emergency</span>
              </a>
              <button
                onClick={handleSendSOS}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-950 flex items-center justify-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>DISPATCH SOS</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3 animate-bounce" />
            <h3 className="text-xl font-bold text-white mb-2">SOS ALERT DISPATCHED</h3>
            <p className="text-xs text-slate-300 mb-6">
              Your live GPS location and ride telemetry have been transmitted to NIBOLODA Emergency Operations Center and local law enforcement dispatch. Help is on the way.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
            >
              Close Alert Dialog
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
