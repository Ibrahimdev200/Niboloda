import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SOSModal } from './components/SOSModal';
import { ReceiptModal } from './components/ReceiptModal';
import { LoadingScreen } from './components/LoadingScreen';

import { PassengerHome } from './pages/Passenger/PassengerHome';
import { PassengerLiveRide } from './pages/Passenger/PassengerLiveRide';
import { PassengerAccess } from './pages/Passenger/PassengerAccess';
import { PassengerDashboard } from './pages/Passenger/PassengerDashboard';

import { DriverDashboard } from './pages/Driver/DriverDashboard';
import { DriverPricingSettings } from './pages/Driver/DriverPricingSettings';
import { DriverSubscription } from './pages/Driver/DriverSubscription';
import { DriverOnboarding } from './pages/Driver/DriverOnboarding';

import { AdminPortal } from './pages/Admin/AdminPortal';
import { LandingPage } from './pages/LandingPage';

export const App = () => {
  const { activePortal, user, loading } = useAuth();
  
  // Initial Website Load Splash State
  const [initialSplash, setInitialSplash] = useState(true);

  // Modals
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [receiptRide, setReceiptRide] = useState(null);

  // Active Passenger Ride state
  const [activeRide, setActiveRide] = useState(null);
  const [passengerScreen, setPassengerScreen] = useState('DASHBOARD');

  // Driver View Sub-Screen state
  const [driverScreen, setDriverScreen] = useState('DASHBOARD'); // 'DASHBOARD', 'PRICING', 'SUBSCRIPTION', 'ONBOARDING'
  const [publicScreen, setPublicScreen] = useState('LANDING');
  const [accessMode, setAccessMode] = useState('login');

  const openAccess = (mode) => {
    setAccessMode(mode);
    setPublicScreen('ACCESS');
  };

  if (initialSplash || loading) {
    return (
      <LoadingScreen 
        message="Connecting to NIBOLODA Network..." 
        fullScreen={true} 
        onFinished={() => setInitialSplash(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative isolate">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[28rem] -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.14),transparent_64%)]" />
      
      {/* Top Navbar */}
      <Navbar onOpenSOS={() => setIsSOSOpen(true)} onAccess={openAccess} />

      {/* Main Body View based on active role portal */}
      <main className="flex-1 pb-12">
        {activePortal === 'PASSENGER' && (
          <div>
            {!user ? (
              publicScreen === 'LANDING' ? <LandingPage onAccess={openAccess} /> : <PassengerAccess initialMode={accessMode} onBack={() => setPublicScreen('LANDING')} />
            ) : !activeRide ? (
              passengerScreen === 'DASHBOARD' ? (
                <PassengerDashboard onBookRide={() => setPassengerScreen('BOOK')} onResumeRide={setActiveRide} />
              ) : (
                <PassengerHome
                  onRideRequested={(ride) => setActiveRide(ride)}
                  onOpenReceipt={(ride) => setReceiptRide(ride)}
                  onBack={() => setPassengerScreen('DASHBOARD')}
                />
              )
            ) : (
              <PassengerLiveRide
                ride={activeRide}
                onRideCompleted={() => setActiveRide(null)}
                onOpenReceipt={(ride) => setReceiptRide(ride)}
              />
            )}
          </div>
        )}

        {activePortal === 'DRIVER' && (
          <div>
            {!user ? (
              <PassengerAccess initialMode={accessMode} onBack={() => setPublicScreen('LANDING')} />
            ) : (
              <>
                {driverScreen === 'DASHBOARD' && (
                  <DriverDashboard
                    onOpenPricing={() => setDriverScreen('PRICING')}
                    onOpenSubscription={() => setDriverScreen('SUBSCRIPTION')}
                    onOpenOnboarding={() => setDriverScreen('ONBOARDING')}
                  />
                )}
                {driverScreen === 'PRICING' && (
                  <DriverPricingSettings onBack={() => setDriverScreen('DASHBOARD')} />
                )}
                {driverScreen === 'SUBSCRIPTION' && (
                  <DriverSubscription onBack={() => setDriverScreen('DASHBOARD')} />
                )}
                {driverScreen === 'ONBOARDING' && (
                  <DriverOnboarding onBack={() => setDriverScreen('DASHBOARD')} />
                )}
              </>
            )}
          </div>
        )}

        {activePortal === 'ADMIN' && (
          <AdminPortal />
        )}
      </main>

      {/* Global Modals */}
      <SOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
        rideId={activeRide?.id}
      />

      <ReceiptModal
        isOpen={!!receiptRide}
        onClose={() => setReceiptRide(null)}
        ride={receiptRide}
      />

      {/* Footer */}
      <footer className="border-t border-emerald-800/40 bg-emerald-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-white font-outfit">NIBOLODA Nigeria</strong> &mdash; Drivers Set the Price. Passengers Choose the Ride.
          </div>
          <div className="text-emerald-400 font-semibold">
            Strictly 0% Platform Trip Commission
          </div>
        </div>
      </footer>

    </div>
  );
};
