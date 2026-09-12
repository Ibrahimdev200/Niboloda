import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MapContainer } from '../../components/MapContainer';
import {
  LayoutDashboard, Users, Car, ShieldCheck, MapPin, CreditCard, DollarSign,
  Star, HelpCircle, AlertTriangle, Settings, FileText, CheckCircle2, XCircle,
  Clock, ShieldAlert, Sparkles, RefreshCw, Eye, EyeOff, ThumbsUp, Tag, Globe, Search,
  User, Check, X, Ban, MessageSquare, ExternalLink
} from 'lucide-react';

export const AdminPortal = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);

  // Section Data
  const [passengers, setPassengers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [rides, setRides] = useState([]);
  const [liveMapData, setLiveMapData] = useState({ onlineDrivers: [], activeRides: [] });
  const [liveMapCenter, setLiveMapCenter] = useState([6.4281, 3.4219]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [subAdmins, setSubAdmins] = useState([]);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // Sub-Admin Creation Modal State
  const [showSubAdminModal, setShowSubAdminModal] = useState(false);
  const [showSubAdminPassword, setShowSubAdminPassword] = useState(false);
  const [subAdminForm, setSubAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    permissions: ['VERIFY_DRIVERS', 'MANAGE_PASSENGERS', 'MANAGE_RIDES']
  });

  // Search & Filter State for Drivers
  const [driverFilter, setDriverFilter] = useState('ALL'); // 'ALL' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [selectedDriverInspect, setSelectedDriverInspect] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
    fetchTabData(activeTab);
  }, [activeTab, driverFilter, searchQuery, token]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchTabData = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'dashboard' || tab === 'live-map') {
        const res = await fetch('/api/admin/live-map', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setLiveMapData(data);
      }
      if (tab === 'passengers') {
        const res = await fetch('/api/admin/passengers', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setPassengers(data.passengers || []);
      }
      if (tab === 'drivers' || tab === 'pending') {
        const queryStatus = tab === 'pending' ? 'PENDING_VERIFICATION' : driverFilter;
        const res = await fetch(`/api/admin/drivers?status=${queryStatus}&search=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
      if (tab === 'vehicles') {
        const res = await fetch('/api/admin/vehicles', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
      if (tab === 'rides') {
        const res = await fetch('/api/admin/rides', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setRides(data.rides || []);
      }
      if (tab === 'subscriptions' || tab === 'plans') {
        const subRes = await fetch('/api/admin/subscriptions', { headers: { Authorization: `Bearer ${token}` } });
        const subData = await subRes.json();
        setSubscriptions(subData.subscriptions || []);

        const planRes = await fetch('/api/admin/subscription-plans', { headers: { Authorization: `Bearer ${token}` } });
        const planData = await planRes.json();
        setPlans(planData.plans || []);
      }
      if (tab === 'payments') {
        const res = await fetch('/api/admin/payments', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setPayments(data.payments || []);
      }
      if (tab === 'ratings') {
        const res = await fetch('/api/admin/ratings', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setRatings(data.ratings || []);
      }
      if (tab === 'support') {
        const res = await fetch('/api/admin/support', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setTickets(data.tickets || []);
      }
      if (tab === 'emergency') {
        const res = await fetch('/api/admin/emergency', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setEmergencyEvents(data.events || []);
      }
      if (tab === 'audit') {
        const res = await fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
      if (tab === 'sub-admins') {
        const [meRes, subRes] = await Promise.all([
          fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          fetch('/api/admin/sub-admins', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        ]);
        setCurrentAdmin(meRes.admin || null);
        setSubAdmins(subRes.subAdmins || []);
      }
    } catch (err) {
      console.error('Fetch tab data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDriver = async (driverId, action) => {
    setActionMessage('');
    setActionError('');

    if (action === 'REJECT' && !rejectionReason.trim()) {
      setActionError('A reason for rejection is required when rejecting a driver application.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, reason: rejectionReason, notes: rejectionReason })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update verification status');
      }

      setActionMessage(`Driver application status updated to ${data.driver?.verificationStatus}`);
      setSelectedDriverInspect(null);
      setRejectionReason('');
      fetchDashboardStats();
      fetchTabData(activeTab);
    } catch (err) {
      setActionError(err.message || 'Verification update failed.');
    }
  };

  const handleCreateSubAdmin = async (e) => {
    e.preventDefault();
    setActionMessage('');
    setActionError('');
    try {
      const res = await fetch('/api/admin/sub-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(subAdminForm)
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Sub-admin ${data.subAdmin.email} created successfully!`);
        setShowSubAdminModal(false);
        setSubAdminForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          password: '',
          permissions: ['VERIFY_DRIVERS', 'MANAGE_PASSENGERS', 'MANAGE_RIDES']
        });
        fetchTabData('sub-admins');
      } else {
        setActionError(data.error || 'Failed to create sub-admin');
      }
    } catch (err) {
      setActionError('Server error creating sub-admin');
    }
  };

  const handleToggleSubAdminPermission = async (subAdminId, currentPermissions, permissionKey) => {
    let newPermissions = [...currentPermissions];
    if (newPermissions.includes(permissionKey)) {
      newPermissions = newPermissions.filter(p => p !== permissionKey);
    } else {
      newPermissions.push(permissionKey);
    }

    try {
      const res = await fetch(`/api/admin/sub-admins/${subAdminId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: newPermissions })
      });
      if (res.ok) {
        fetchTabData('sub-admins');
      }
    } catch (err) {
      console.error('Permission update error:', err);
    }
  };

  const handleToggleSubAdminStatus = async (subAdminId, currentActive) => {
    try {
      const res = await fetch(`/api/admin/sub-admins/${subAdminId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentActive })
      });
      if (res.ok) {
        fetchTabData('sub-admins');
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const inspectDriverDossier = async (driverId) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/dossier`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.driver) {
        setSelectedDriverInspect(data.driver);
      }
    } catch (err) {
      console.error('Dossier fetch error:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      
      {/* Top Admin Header */}
      <div className="glass-panel p-6 rounded-3xl border border-amber-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold tracking-widest text-amber-400 uppercase">SUPER ADMIN COMMAND CENTER</span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              NIBOLODA VERIFICATION & FLEET CONTROL
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white font-outfit mt-1">NIBOLODA Administration & Operations</h1>
          <p className="text-xs text-slate-300">Driver application review, identity documents, vehicle verification, and zero-commission fleet management.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => { fetchDashboardStats(); fetchTabData(activeTab); }}
            className="px-4 py-2 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/50 text-emerald-300 font-bold text-xs rounded-xl flex items-center space-x-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-900/80 border border-emerald-500 rounded-2xl text-emerald-300 text-xs font-bold animate-in fade-in">
          {actionMessage}
        </div>
      )}

      {/* Main Admin Navigation & Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <div className="glass-panel p-3 rounded-2xl border border-emerald-800/40 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">Core Dashboard</div>
            {[
              { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
              { id: 'live-map', label: 'Live Fleet Radar Map', icon: MapPin },
              { id: 'pending', label: 'Pending Verifications', icon: Clock, badge: stats?.pendingDrivers },
              { id: 'drivers', label: 'Driver Verification Portal', icon: Car },
              { id: 'passengers', label: 'All Passengers', icon: Users },
              { id: 'vehicles', label: 'Vehicle Registry', icon: Car },
              { id: 'rides', label: 'Ride History Log', icon: MapPin }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeTab === item.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-300 hover:bg-emerald-900/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="px-3 py-1.5 text-[10px] font-extrabold text-amber-400 uppercase tracking-wider pt-2 border-t border-emerald-900/60">Monetization & Safety</div>
            {[
              { id: 'subscriptions', label: 'Driver Subscriptions', icon: CreditCard },
              { id: 'plans', label: 'Subscription Plans', icon: Tag },
              { id: 'payments', label: 'Payment Audit Log', icon: DollarSign },
              { id: 'ratings', label: 'Ratings & Reviews', icon: Star },
              { id: 'support', label: 'Support Tickets', icon: HelpCircle },
              { id: 'emergency', label: 'SOS Alert Center', icon: ShieldAlert, badge: stats?.activeSOSCount },
              { id: 'audit', label: 'Audit Trail Logs', icon: FileText }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeTab === item.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-300 hover:bg-emerald-900/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="px-3 py-1.5 text-[10px] font-extrabold text-amber-400 uppercase tracking-wider pt-2 border-t border-emerald-900/60">Admin & Permissions</div>
            {[
              { id: 'sub-admins', label: 'Team & Sub-Admins', icon: Settings }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeTab === item.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-300 hover:bg-emerald-900/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content View Area */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-emerald-800/40">
                  <span className="text-xs text-slate-400 font-semibold">Total Drivers</span>
                  <div className="text-3xl font-extrabold text-white font-outfit mt-1">{stats?.totalDrivers || 0}</div>
                  <span className="text-[10px] text-emerald-400 mt-1 block">{stats?.verifiedDrivers || 0} Approved | {stats?.pendingDrivers || 0} Pending</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-emerald-800/40">
                  <span className="text-xs text-slate-400 font-semibold">Total Passengers</span>
                  <div className="text-3xl font-extrabold text-white font-outfit mt-1">{stats?.totalPassengers || 0}</div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Registered Platform Passengers</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-amber-500/40">
                  <span className="text-xs text-slate-400 font-semibold">Subscription Revenue</span>
                  <div className="text-3xl font-extrabold text-amber-400 font-outfit mt-1">₦{stats?.totalSubRevenue?.toLocaleString() || '0'}</div>
                  <span className="text-[10px] text-amber-300 mt-1 block">{stats?.activeSubs || 0} Active Subscriptions</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-emerald-800/40">
                  <span className="text-xs text-slate-400 font-semibold">Platform Commission</span>
                  <div className="text-3xl font-extrabold text-emerald-400 font-outfit mt-1">0% (₦0.00)</div>
                  <span className="text-[10px] text-emerald-300 mt-1 block">100% Fare Retained by Drivers</span>
                </div>
              </div>

              {/* Live Map Preview */}
              <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-base font-outfit">Live Fleet Radar</h3>
                  <span className="text-xs text-emerald-400 font-bold">{liveMapData.onlineDrivers?.length || 0} Drivers Online</span>
                </div>
                <MapContainer
                  drivers={liveMapData.onlineDrivers}
                  height="360px"
                />
              </div>

            </div>
          )}

          {/* LIVE MAP */}
          {activeTab === 'live-map' && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/40 pb-3">
                <div>
                  <h3 className="font-extrabold text-white text-lg font-outfit flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    Real-Time Fleet & Active Rides Radar
                  </h3>
                  <p className="text-xs text-slate-300">Live GPS tracking for all subscribed drivers, moving trips, and emergency beacons.</p>
                </div>

                {/* City Center Quick Focus Buttons */}
                <div className="flex items-center gap-1.5 bg-emerald-950/80 p-1.5 rounded-xl border border-emerald-800/60">
                  <span className="text-[10px] font-bold text-slate-400 px-1">Region:</span>
                  {[
                    { label: 'Lagos', center: [6.4281, 3.4219] },
                    { label: 'Abuja FCT', center: [9.0765, 7.3986] },
                    { label: 'Port Harcourt', center: [4.8156, 7.0498] }
                  ].map((city) => (
                    <button
                      key={city.label}
                      onClick={() => setLiveMapCenter(city.center)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/40 transition"
                    >
                      {city.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/40 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold text-white">{liveMapData.onlineDrivers?.length || 0} Drivers Online</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="font-bold text-amber-300">{liveMapData.activeRides?.length || 0} Active Trips</span>
                  </div>
                  {emergencyEvents.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                      <span className="font-bold text-red-400">{emergencyEvents.length} Active SOS Alerts</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => fetchTabData('live-map')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8">
                  <MapContainer
                    center={liveMapCenter || [6.4281, 3.4219]}
                    drivers={liveMapData.onlineDrivers}
                    sosEvents={emergencyEvents}
                    height="560px"
                  />
                </div>

                <div className="lg:col-span-4 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Fleet Telemetry</h4>
                  {(!liveMapData.onlineDrivers || liveMapData.onlineDrivers.length === 0) ? (
                    <div className="bg-emerald-950/40 p-6 rounded-2xl border border-emerald-800/40 text-center text-slate-400 text-xs">
                      <Car className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                      <p className="font-semibold text-white">No active online drivers</p>
                      <p className="text-[11px] text-slate-400 mt-1">Drivers will appear here on the radar map once they come online from their app.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {liveMapData.onlineDrivers.map((d) => (
                        <div key={d.driverId || d.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-white space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span>{d.firstName} {d.lastName}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">ONLINE</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {d.vehicle?.make} {d.vehicle?.model} • {d.vehicle?.plateNumber}
                          </div>
                          <div className="text-[10px] text-amber-400">
                            GPS: {d.latitude?.toFixed(4)}, {d.longitude?.toFixed(4)} • Heading: {d.heading || 0}°
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DRIVER VERIFICATION PORTAL & PENDING QUEUE */}
          {(activeTab === 'drivers' || activeTab === 'pending') && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/40 pb-4">
                <div>
                  <h3 className="font-extrabold text-white text-lg font-outfit">
                    {activeTab === 'pending' ? 'Pending Driver Verification Queue' : 'Driver Verification Management'}
                  </h3>
                  <p className="text-xs text-slate-300">Inspect personal information, identity documents, vehicle certificates, and pricing configuration.</p>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, phone, plate..."
                      className="bg-emerald-950 border border-emerald-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-400 w-48"
                    />
                  </div>

                  {activeTab !== 'pending' && (
                    <select
                      value={driverFilter}
                      onChange={(e) => setDriverFilter(e.target.value)}
                      className="bg-emerald-950 border border-emerald-700/60 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING_VERIFICATION">Pending Verification</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Driver List */}
              {drivers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No driver applications matching query.</div>
              ) : (
                <div className="space-y-4">
                  {drivers.map(d => (
                    <div key={d.id} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <img src={d.profilePhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'} className="w-12 h-12 rounded-full object-cover border border-emerald-500/50" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-white text-sm">{d.firstName} {d.lastName}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                d.verificationStatus === 'APPROVED' 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                  : d.verificationStatus === 'SUSPENDED'
                                    ? 'bg-red-900/40 text-red-400 border border-red-700/60'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                {d.verificationStatus}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">Phone: {d.user?.phone} | Email: {d.user?.email || 'N/A'}</div>
                            <div className="text-xs text-emerald-400 mt-0.5">
                              Vehicle: {d.vehicle?.make} {d.vehicle?.model} ({d.vehicle?.plateNumber || 'No Plate'}) • Type: {d.vehicle?.vehicleType || 'Sedan'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => inspectDriverDossier(d.id)}
                            className="px-3.5 py-2 bg-emerald-800/60 hover:bg-emerald-700 border border-emerald-600/50 text-emerald-200 font-bold text-xs rounded-xl flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect Dossier
                          </button>

                          <button
                            onClick={() => handleVerifyDriver(d.id, 'APPROVE')}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> APPROVE
                          </button>

                          <button
                            onClick={() => { setSelectedDriverInspect(d); setRejectionReason(''); }}
                            className="px-3.5 py-2 bg-red-900/60 hover:bg-red-800 text-red-200 font-bold text-xs rounded-xl flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> REJECT
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ALL PASSENGERS */}
          {activeTab === 'passengers' && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 space-y-4">
              <h3 className="font-extrabold text-white text-lg font-outfit">Registered Platform Passengers ({passengers.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-emerald-950 text-emerald-400 font-bold border-b border-emerald-800">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">State / City</th>
                      <th className="p-3">Rides</th>
                      <th className="p-3">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/40">
                    {passengers.map(p => (
                      <tr key={p.id} className="hover:bg-emerald-900/30">
                        <td className="p-3 font-bold text-white">{p.firstName} {p.lastName}</td>
                        <td className="p-3">{p.user?.phone}</td>
                        <td className="p-3">{p.user?.email || 'N/A'}</td>
                        <td className="p-3 text-slate-400">{p.state || 'Lagos'} / {p.city || 'Lagos'}</td>
                        <td className="p-3">{p.totalRides}</td>
                        <td className="p-3 font-bold text-amber-400">⭐ {p.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VEHICLE REGISTRY */}
          {activeTab === 'vehicles' && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 space-y-4">
              <h3 className="font-extrabold text-white text-lg font-outfit">Registered Vehicles ({vehicles.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-emerald-950 text-emerald-400 font-bold border-b border-emerald-800">
                    <tr>
                      <th className="p-3">Plate Number</th>
                      <th className="p-3">Make / Model</th>
                      <th className="p-3">Year / Color</th>
                      <th className="p-3">Type / Seats</th>
                      <th className="p-3">Driver</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/40">
                    {vehicles.map(v => (
                      <tr key={v.id} className="hover:bg-emerald-900/30">
                        <td className="p-3 font-mono font-bold text-amber-300">{v.plateNumber}</td>
                        <td className="p-3 font-bold text-white">{v.make} {v.model}</td>
                        <td className="p-3">{v.year} · {v.color}</td>
                        <td className="p-3">{v.vehicleType || 'Sedan'} ({v.seats || 4} seats)</td>
                        <td className="p-3 font-medium">{v.driver?.firstName} {v.driver?.lastName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.isVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {v.isVerified ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RIDE HISTORY */}
          {activeTab === 'rides' && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 space-y-4">
              <h3 className="font-extrabold text-white text-lg font-outfit">All Platform Rides ({rides.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-emerald-950 text-emerald-400 font-bold border-b border-emerald-800">
                    <tr>
                      <th className="p-3">Pickup / Destination</th>
                      <th className="p-3">Driver</th>
                      <th className="p-3">Agreed Fare</th>
                      <th className="p-3">NIBOLODA Comm.</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/40">
                    {rides.map(r => (
                      <tr key={r.id} className="hover:bg-emerald-900/30">
                        <td className="p-3">
                          <div className="font-bold text-white">{r.pickupName}</div>
                          <div className="text-[10px] text-slate-400">➡️ {r.destName}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-200">{r.driver?.firstName} {r.driver?.lastName}</td>
                        <td className="p-3 font-bold text-amber-400">₦{r.agreedFare?.toLocaleString()}</td>
                        <td className="p-3 font-bold text-emerald-400">₦0.00 (0%)</td>
                        <td className="p-3">
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBSCRIPTIONS */}
          {(activeTab === 'subscriptions' || activeTab === 'plans') && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 space-y-6">
              <div>
                <h3 className="font-extrabold text-white text-lg font-outfit">Subscription Plans & Driver Active Log</h3>
                <p className="text-xs text-slate-400">Admin can configure subscription prices stored in database.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {plans.map(pl => (
                  <div key={pl.id} className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-extrabold text-amber-400 uppercase">{pl.code}</span>
                    <h4 className="font-bold text-white text-sm">{pl.name}</h4>
                    <div className="text-xl font-extrabold text-amber-400 font-outfit">₦{pl.price.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-400 block">{pl.durationDays} Days Duration</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 space-y-4">
              <h3 className="font-extrabold text-white text-lg font-outfit">Payment & Transaction Audit Log ({payments.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-emerald-950 text-emerald-400 font-bold border-b border-emerald-800">
                    <tr>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Gateway Fee</th>
                      <th className="p-3">Driver Earnings</th>
                      <th className="p-3">NIBOLODA Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/40">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-emerald-900/30">
                        <td className="p-3 font-mono text-[10px] text-amber-300">{p.providerRef}</td>
                        <td className="p-3 font-bold">{p.type}</td>
                        <td className="p-3 font-bold text-white">₦{p.amount?.toLocaleString()}</td>
                        <td className="p-3 text-slate-400">₦{p.gatewayFee?.toLocaleString()}</td>
                        <td className="p-3 font-bold text-amber-400">₦{p.driverEarnings?.toLocaleString()}</td>
                        <td className="p-3 font-bold text-emerald-400">₦{p.commission?.toLocaleString()} (0%)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EMERGENCY SOS */}
          {activeTab === 'emergency' && (
            <div className="glass-panel p-6 rounded-3xl border border-red-700/60 space-y-4 bg-red-950/40">
              <h3 className="font-extrabold text-red-300 text-lg font-outfit flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" /> Emergency SOS Alert Center ({emergencyEvents.length})
              </h3>
              {emergencyEvents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No active emergency SOS alerts recorded.</div>
              ) : (
                <div className="space-y-3">
                  {emergencyEvents.map(ev => (
                    <div key={ev.id} className="p-4 bg-red-900/50 border border-red-700/60 rounded-2xl flex items-center justify-between text-xs text-white">
                      <div>
                        <div className="font-bold text-red-300">{ev.emergencyType}</div>
                        <div className="text-[11px] text-slate-300">User ID: {ev.userId} | Coordinates: {ev.latitude}, {ev.longitude}</div>
                        <div className="text-[10px] text-slate-400">{new Date(ev.createdAt).toLocaleString()}</div>
                      </div>
                      <span className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg text-[10px]">ACTIVE DISPATCH</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-ADMINS & TEAM PERMISSIONS */}
          {activeTab === 'sub-admins' && (
            <div className="glass-panel p-6 rounded-3xl border border-amber-500/40 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-800/40 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-white text-lg font-outfit">Team Members & Sub-Admin Control</h3>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      GRANULAR PERMISSIONS ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">Super Admin can create sub-admins and assign precise operational permissions.</p>
                </div>

                <button
                  onClick={() => setShowSubAdminModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5"
                >
                  <User className="w-4 h-4" />
                  <span>+ CREATE SUB-ADMIN</span>
                </button>
              </div>

              {actionError && (
                <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs font-bold rounded-xl">
                  {actionError}
                </div>
              )}

              {/* Sub-Admin Cards List */}
              <div className="space-y-4">
                {subAdmins.map(admin => (
                  <div key={admin.id} className="glass-panel p-4 rounded-2xl border border-emerald-800/50 bg-slate-900/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-white text-sm">{admin.firstName} {admin.lastName}</h4>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {admin.role.replaceAll('_', ' ')}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            admin.isActive ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-950 text-red-400'
                          }`}>
                            {admin.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Email: <strong className="text-slate-200">{admin.email}</strong> • Phone: <strong className="text-slate-200">{admin.phone}</strong>
                        </div>
                      </div>

                      {admin.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleToggleSubAdminStatus(admin.id, admin.isActive)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
                            admin.isActive
                              ? 'bg-red-950/60 text-red-300 border-red-700/60 hover:bg-red-900'
                              : 'bg-emerald-900/60 text-emerald-300 border-emerald-600/60 hover:bg-emerald-800'
                          }`}
                        >
                          {admin.isActive ? 'SUSPEND SUB-ADMIN' : 'REACTIVATE SUB-ADMIN'}
                        </button>
                      )}
                    </div>

                    {/* Permissions Toggle Matrix */}
                    <div>
                      <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block mb-2">
                        Assigned Operational Permissions (Click badge to toggle)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'VERIFY_DRIVERS', label: 'Driver Verification & Dossiers' },
                          { key: 'MANAGE_PASSENGERS', label: 'Passenger Accounts' },
                          { key: 'MANAGE_RIDES', label: 'Live Trips & Overrides' },
                          { key: 'MANAGE_SUBSCRIPTIONS', label: 'Subscription Passes & Pricing' },
                          { key: 'MANAGE_SUBADMINS', label: 'Team & Sub-Admins' },
                          { key: 'VIEW_ANALYTICS', label: 'Revenue Reports' }
                        ].map(perm => {
                          const isGranted = admin.permissions?.includes(perm.key) || admin.role === 'SUPER_ADMIN';
                          return (
                            <button
                              key={perm.key}
                              disabled={admin.role === 'SUPER_ADMIN'}
                              onClick={() => handleToggleSubAdminPermission(admin.id, admin.permissions || [], perm.key)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center space-x-1.5 transition-all ${
                                isGranted
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 hover:border-emerald-400'
                                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span>{isGranted ? '✓' : '+'}</span>
                              <span>{perm.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* CREATE SUB-ADMIN MODAL */}
      {showSubAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md grid place-items-center p-4">
          <div className="bg-emerald-950 border border-amber-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">SUPER ADMIN MANAGEMENT</span>
                <h3 className="text-lg font-extrabold text-white font-outfit">Create New Sub-Admin Account</h3>
              </div>
              <button
                onClick={() => setShowSubAdminModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubAdmin} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">First Name *</span>
                  <input
                    type="text"
                    required
                    value={subAdminForm.firstName}
                    onChange={e => setSubAdminForm({ ...subAdminForm, firstName: e.target.value })}
                    placeholder="e.g. Samuel"
                    className="w-full bg-slate-900 border border-emerald-800/60 rounded-xl p-2.5 text-white outline-none focus:border-amber-400"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Last Name *</span>
                  <input
                    type="text"
                    required
                    value={subAdminForm.lastName}
                    onChange={e => setSubAdminForm({ ...subAdminForm, lastName: e.target.value })}
                    placeholder="e.g. Balogun"
                    className="w-full bg-slate-900 border border-emerald-800/60 rounded-xl p-2.5 text-white outline-none focus:border-amber-400"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-slate-300 font-semibold block mb-1">Email Address (Admin Login) *</span>
                <input
                  type="email"
                  required
                  value={subAdminForm.email}
                  onChange={e => setSubAdminForm({ ...subAdminForm, email: e.target.value })}
                  placeholder="admin.samuel@niboloda.ng"
                  className="w-full bg-slate-900 border border-emerald-800/60 rounded-xl p-2.5 text-white outline-none focus:border-amber-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Phone Number *</span>
                  <input
                    type="text"
                    required
                    value={subAdminForm.phone}
                    onChange={e => setSubAdminForm({ ...subAdminForm, phone: e.target.value })}
                    placeholder="+2348011223344"
                    className="w-full bg-slate-900 border border-emerald-800/60 rounded-xl p-2.5 text-white outline-none focus:border-amber-400"
                  />
                </label>

                <label className="block">
                  <span className="text-slate-300 font-semibold block mb-1">Initial Password *</span>
                  <div className="flex items-center bg-slate-900 border border-emerald-800/60 rounded-xl pr-2 focus-within:border-amber-400">
                    <input
                      type={showSubAdminPassword ? "text" : "password"}
                      required
                      value={subAdminForm.password}
                      onChange={e => setSubAdminForm({ ...subAdminForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-transparent p-2.5 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSubAdminPassword(!showSubAdminPassword)}
                      className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                      title={showSubAdminPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showSubAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-emerald-900/60">
                <span className="text-slate-300 font-extrabold text-[11px] block text-amber-400">
                  Assign Granular Operational Permissions
                </span>
                <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                  {[
                    { key: 'VERIFY_DRIVERS', label: 'Driver Verification & Identity Dossiers' },
                    { key: 'MANAGE_PASSENGERS', label: 'Passenger Accounts & Suspensions' },
                    { key: 'MANAGE_RIDES', label: 'Live Trip Radar & Ride Overrides' },
                    { key: 'MANAGE_SUBSCRIPTIONS', label: 'Subscription Passes & Pricing Rules' },
                    { key: 'MANAGE_SUBADMINS', label: 'Team Management & Sub-Admin Creation' },
                    { key: 'VIEW_ANALYTICS', label: 'Platform Revenue & Financial Analytics' }
                  ].map(p => {
                    const isChecked = subAdminForm.permissions.includes(p.key);
                    return (
                      <label key={p.key} className="flex items-center space-x-2.5 text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSubAdminForm({ ...subAdminForm, permissions: [...subAdminForm.permissions, p.key] });
                            } else {
                              setSubAdminForm({ ...subAdminForm, permissions: subAdminForm.permissions.filter(k => k !== p.key) });
                            }
                          }}
                          className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                        />
                        <span className="font-semibold text-xs">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-emerald-900">
                <button
                  type="button"
                  onClick={() => setShowSubAdminModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-900"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg"
                >
                  CREATE SUB-ADMIN NOW
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL DRIVER VERIFICATION DOSSIER INSPECTION MODAL */}
      {selectedDriverInspect && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md grid place-items-center p-4 overflow-y-auto">
          <div className="bg-emerald-950 border border-emerald-500/40 rounded-3xl p-6 max-w-3xl w-full space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-emerald-800/40 pb-4">
              <div>
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">
                  ADMIN VERIFICATION DOSSIER
                </span>
                <h3 className="text-2xl font-extrabold text-white font-outfit mt-0.5">
                  {selectedDriverInspect.firstName} {selectedDriverInspect.lastName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDriverInspect(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-emerald-900/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-950 border border-red-500/40 rounded-xl text-red-200 text-xs font-bold">
                {actionError}
              </div>
            )}

            {/* Dossier Grid Details */}
            <div className="space-y-4 text-xs">
              
              {/* Personal Info */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-extrabold text-emerald-400 uppercase text-[10px]">1. Personal Information</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-200">
                  <div>Phone: <strong className="text-white block">{selectedDriverInspect.user?.phone}</strong></div>
                  <div>Email: <strong className="text-white block">{selectedDriverInspect.user?.email || 'N/A'}</strong></div>
                  <div>Gender: <strong className="text-white block">{selectedDriverInspect.gender || 'N/A'}</strong></div>
                  <div>Address: <strong className="text-white block">{selectedDriverInspect.address || 'N/A'}</strong></div>
                  <div>State / City: <strong className="text-white block">{selectedDriverInspect.state} / {selectedDriverInspect.city}</strong></div>
                  <div>Status: <strong className="text-amber-400 block">{selectedDriverInspect.verificationStatus}</strong></div>
                </div>
              </div>

              {/* Identity & Documents */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-extrabold text-emerald-400 uppercase text-[10px]">2. Identity & License Documents</span>
                <div className="grid grid-cols-2 gap-3 text-slate-200">
                  <div>Govt ID Type: <strong className="text-white block">{selectedDriverInspect.governmentIdType || 'NIN'}</strong></div>
                  <div>Govt ID Number: <strong className="text-white block">{selectedDriverInspect.governmentIdNumber || selectedDriverInspect.governmentId || 'N/A'}</strong></div>
                  <div>Driver's License No.: <strong className="text-amber-400 font-mono block">{selectedDriverInspect.licenseNumber || 'N/A'}</strong></div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                  {selectedDriverInspect.governmentIdDocUrl && (
                    <a href={selectedDriverInspect.governmentIdDocUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/60 border border-emerald-600/50 rounded-xl text-emerald-300 font-bold hover:underline">
                      <FileText className="w-3.5 h-3.5" /> View Govt ID Document <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedDriverInspect.licenseDocUrl && (
                    <a href={selectedDriverInspect.licenseDocUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/60 border border-emerald-600/50 rounded-xl text-emerald-300 font-bold hover:underline">
                      <FileText className="w-3.5 h-3.5" /> View License Document <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Vehicle Specs & Uploaded Photos */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-extrabold text-emerald-400 uppercase text-[10px]">3. Vehicle Information & Uploaded Certificates</span>
                {selectedDriverInspect.vehicle ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-200">
                    <div>Make / Model: <strong className="text-white block">{selectedDriverInspect.vehicle.make} {selectedDriverInspect.vehicle.model}</strong></div>
                    <div>Year / Color: <strong className="text-white block">{selectedDriverInspect.vehicle.year} · {selectedDriverInspect.vehicle.color}</strong></div>
                    <div>Plate Number: <strong className="text-amber-400 font-mono block">{selectedDriverInspect.vehicle.plateNumber}</strong></div>
                    <div>Type: <strong className="text-white block">{selectedDriverInspect.vehicle.vehicleType || 'Sedan'}</strong></div>
                    <div>Seats: <strong className="text-white block">{selectedDriverInspect.vehicle.seats || 4} Seats</strong></div>
                    <div>Vehicle Verified: <strong className="text-emerald-400 block">{selectedDriverInspect.vehicle.isVerified ? 'YES' : 'NO'}</strong></div>
                  </div>
                ) : <p className="text-slate-400">No vehicle registered yet.</p>}
              </div>

              {/* Driver Pricing Configuration */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-extrabold text-amber-400 uppercase text-[10px]">4. Driver Custom Pricing Rules</span>
                {selectedDriverInspect.pricing ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-200">
                    <div>Min Fare: <strong className="text-amber-400 block">₦{selectedDriverInspect.pricing.minFare?.toLocaleString()}</strong></div>
                    <div>Base Fare: <strong className="text-white block">₦{selectedDriverInspect.pricing.preferredFare?.toLocaleString()}</strong></div>
                    <div>Per KM Rate: <strong className="text-white block">₦{selectedDriverInspect.pricing.pricePerKm?.toLocaleString()}</strong></div>
                    <div>Per Min Rate: <strong className="text-white block">₦{selectedDriverInspect.pricing.pricePerMin?.toLocaleString()}</strong></div>
                  </div>
                ) : <p className="text-slate-400">Default pricing active.</p>}
              </div>

              {/* Admin Action Box */}
              <div className="space-y-3 pt-3 border-t border-emerald-800/40">
                <label className="block">
                  <span className="text-xs font-bold text-slate-300 block mb-1">
                    Rejection / Verification Reason Notes (Required for REJECT action) *
                  </span>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter explicit reason for rejection, suspension, or requested changes..."
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400"
                  />
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleVerifyDriver(selectedDriverInspect.id, 'APPROVE')}
                    className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" /> APPROVE
                  </button>

                  <button
                    onClick={() => handleVerifyDriver(selectedDriverInspect.id, 'REJECT')}
                    className="py-3 bg-red-800 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1"
                  >
                    <X className="w-4 h-4" /> REJECT
                  </button>

                  <button
                    onClick={() => handleVerifyDriver(selectedDriverInspect.id, 'REQUEST_MORE_INFO')}
                    className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" /> REQUEST INFO
                  </button>

                  <button
                    onClick={() => handleVerifyDriver(selectedDriverInspect.id, 'SUSPEND')}
                    className="py-3 bg-red-950 hover:bg-red-900 border border-red-700/60 text-red-300 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1"
                  >
                    <Ban className="w-4 h-4" /> SUSPEND
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
