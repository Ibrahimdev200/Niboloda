import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { safeFetch } from '../../utils/api';
import { 
  ArrowRight, 
  Car, 
  CheckCircle2, 
  Compass, 
  KeyRound, 
  LockKeyhole, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  UserRound, 
  AlertCircle, 
  FileText, 
  Check, 
  Calendar, 
  User, 
  Shield, 
  Heart, 
  Upload, 
  RefreshCw, 
  ArrowLeft,
  Eye,
  EyeOff,
  Mail
} from 'lucide-react';

const valueProps = [
  'Choose the driver and fare that work for you',
  'See verified vehicle and driver information',
  'Keep a clear record of every trip and payment'
];

export const PassengerAccess = ({ initialMode = 'landing', onBack }) => {
  const { login, verifyOtp } = useAuth();
  
  // View mode: 'LANDING' | 'PASSENGER_REG' | 'DRIVER_REG' | 'LOGIN' | 'OTP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD'
  const [viewMode, setViewMode] = useState('LANDING');
  
  // Form State for Passenger Registration
  const [passengerForm, setPassengerForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'Male',
    address: '',
    state: 'Lagos',
    city: 'Lagos Island',
    password: '',
    confirmPassword: '',
    profilePhoto: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: 'Parent',
    agreedToTerms: false
  });

  // Form State for Driver Registration
  const [driverForm, setDriverForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'Male',
    address: '',
    state: 'Lagos',
    city: 'Lagos Island',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    vehicleMake: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleYear: '2020',
    vehicleColor: 'Silver',
    vehiclePlate: '',
    agreedToTerms: false
  });

  // Form State for Login
  const [loginForm, setLoginForm] = useState({
    phoneOrEmail: '',
    password: '',
    role: 'PASSENGER'
  });

  // Form State for Forgot & Reset Password
  const [forgotForm, setForgotForm] = useState({
    phoneOrEmail: ''
  });

  const [resetForm, setResetForm] = useState({
    phoneOrEmail: '',
    otpCode: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Pending Auth State for OTP step
  const [pendingAuth, setPendingAuth] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialMode === 'login') setViewMode('LOGIN');
    else if (initialMode === 'register') setViewMode('LANDING');
    else setViewMode('LANDING');
    setError('');
  }, [initialMode]);

  // Resend cooldown timer
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const updatePassengerField = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setPassengerForm((prev) => ({ ...prev, [field]: val }));
  };

  const updateDriverField = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDriverForm((prev) => ({ ...prev, [field]: val }));
  };

  const updateLoginField = (field) => (e) => {
    setLoginForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // Image Upload Handler for Profile Photo
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo size must not exceed 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPassengerForm((prev) => ({ ...prev, profilePhoto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Passenger Registration Submission
  const handlePassengerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (passengerForm.password !== passengerForm.confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (!passengerForm.agreedToTerms) {
      setError('You must agree to NIBOLODA’s Terms of Service and Privacy Policy to continue.');
      return;
    }

    setSubmitting(true);

    try {
      const data = await safeFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...passengerForm,
          role: 'PASSENGER'
        })
      });

      if (!data.token) {
        throw new Error(data.error || 'Registration failed. Please check your information and try again.');
      }

      setSuccessMsg(data.message || 'Registration successful! Entering dashboard…');
      login(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Driver Registration Submission
  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (driverForm.password !== driverForm.confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (!driverForm.agreedToTerms) {
      setError('You must agree to NIBOLODA’s Terms of Service and Privacy Policy to continue.');
      return;
    }

    setSubmitting(true);

    try {
      const data = await safeFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...driverForm,
          role: 'DRIVER'
        })
      });

      if (!data.token) {
        throw new Error(data.error || 'Driver registration failed. Please check your information.');
      }

      setSuccessMsg(data.message || 'Driver registration successful! Entering portal…');
      login(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Driver registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await safeFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (!data.token) {
        throw new Error(data.error || 'Invalid credentials or account type selection.');
      }
      login(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Forgot Password Request
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const data = await safeFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgotForm)
      });

      setResetForm({
        phoneOrEmail: forgotForm.phoneOrEmail,
        otpCode: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPendingAuth({
        phone: data.phoneOrEmail
      });
      setSuccessMsg('A 4-digit password reset code has been sent to your email and phone.');
      setViewMode('RESET_PASSWORD');
    } catch (err) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reset Password Submission
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('Passwords do not match. Please verify your new password.');
      return;
    }

    if (resetForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      await safeFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneOrEmail: resetForm.phoneOrEmail,
          otpCode: resetForm.otpCode,
          newPassword: resetForm.newPassword
        })
      });

      setSuccessMsg('Password updated successfully! Please sign in with your new password.');
      setLoginForm((prev) => ({
        ...prev,
        phoneOrEmail: resetForm.phoneOrEmail,
        password: resetForm.newPassword
      }));
      setTimeout(() => {
        setViewMode('LOGIN');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle OTP Account Confirmation
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await verifyOtp(pendingAuth.phone, otpInput);
      if (res.success) {
        setSuccessMsg('Account confirmed successfully! Entering dashboard…');
        setTimeout(() => {
          login(res.user || pendingAuth.user, pendingAuth.token);
        }, 600);
      } else {
        setError(res.error || 'Invalid 4-digit verification code.');
      }
    } catch (err) {
      setError('Invalid 4-digit verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Resend 4-digit OTP Code
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccessMsg('');

    try {
      const data = await safeFetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pendingAuth.phone })
      });

      if (data.otpCode) {
        setOtpInput(data.otpCode);
        setPendingAuth((prev) => ({ ...prev, otpCode: data.otpCode }));
      }
      setResendCooldown(60);
      setSuccessMsg('New 4-digit verification code generated!');
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="grid lg:grid-cols-[1.05fr_.95fr] overflow-hidden rounded-[2.5rem] border border-emerald-500/20 bg-emerald-950/45 shadow-2xl shadow-black/30">
        
        {/* Left Branding Panel */}
        <div className="relative p-8 sm:p-12 lg:p-14 overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 flex flex-col justify-between">
          <div className="absolute -top-28 -right-20 h-80 w-80 rounded-full bg-emerald-300/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
          
          <div className="relative max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-emerald-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> WELCOME TO NIBOLODA
            </div>
            
            <h1 className="mt-6 font-outfit text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Drivers Set the Price.<br />
              <span className="text-emerald-300">Passengers Choose the Ride.</span>
            </h1>
            
            <p className="mt-4 text-sm leading-6 text-emerald-50/85 sm:text-base">
              Nigeria’s 0% commission ride marketplace built for fair fares, safety, and choice.
            </p>

            <div className="mt-8 space-y-3">
              {valueProps.map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-xs sm:text-sm font-medium text-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-amber-300 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-8 pt-6 border-t border-emerald-600/30 flex items-center justify-between text-xs text-emerald-200">
            <span>🛡️ 100% Encrypted & Verified</span>
            <span className="font-bold text-amber-300">0% Trip Commission</span>
          </div>
        </div>

        {/* Right Authentication Action Panel */}
        <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-md w-full mx-auto space-y-6">

            {/* 1. LANDING SELECTION SCREEN */}
            {viewMode === 'LANDING' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <span className="text-[11px] font-extrabold tracking-[.18em] text-emerald-400 uppercase">
                    GET STARTED
                  </span>
                  <h2 className="mt-1 font-outfit text-2xl font-extrabold text-white">
                    Choose Your Registration Path
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Select how you want to use NIBOLODA to create your account:
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setViewMode('PASSENGER_REG')}
                    className="w-full text-left p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/60 hover:bg-emerald-900/60 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                        <Compass className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Passenger Account</h3>
                        <p className="text-xs text-slate-400">Request rides and choose your driver at custom prices.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => setViewMode('DRIVER_REG')}
                    className="w-full text-left p-5 rounded-2xl border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/40 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                        <Car className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Pilot / Driver Account</h3>
                        <p className="text-xs text-slate-400">Set your own prices and keep 100% of your earnings (0% commission).</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="pt-4 border-t border-emerald-800/40 text-center">
                  <p className="text-xs text-slate-400">
                    Already have an account?{' '}
                    <button
                      onClick={() => setViewMode('LOGIN')}
                      className="font-bold text-emerald-400 hover:text-emerald-300 underline"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* 2. PASSENGER REGISTRATION FORM */}
            {viewMode === 'PASSENGER_REG' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold tracking-[.18em] text-emerald-400 uppercase">
                      STEP 1 OF 2
                    </span>
                    <h2 className="mt-1 font-outfit text-2xl font-extrabold text-white">
                      Passenger Registration
                    </h2>
                  </div>
                  <button
                    onClick={() => setViewMode('LANDING')}
                    className="text-xs font-bold text-slate-400 hover:text-white inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                </div>

                <form onSubmit={handlePassengerSubmit} className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
                  
                  {/* Section 1: Personal Information */}
                  <div className="space-y-3">
                    <span className="block text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                      1. Personal Information
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="First Name *" 
                        value={passengerForm.firstName} 
                        onChange={updatePassengerField('firstName')} 
                        icon={<User className="h-4 w-4" />} 
                        placeholder="Chukwudi" 
                        required 
                      />
                      <Field 
                        label="Last Name *" 
                        value={passengerForm.lastName} 
                        onChange={updatePassengerField('lastName')} 
                        icon={<User className="h-4 w-4" />} 
                        placeholder="Eze" 
                        required 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="Phone Number *" 
                        type="tel"
                        value={passengerForm.phone} 
                        onChange={updatePassengerField('phone')} 
                        icon={<Phone className="h-4 w-4" />} 
                        placeholder="+234 803 123 4567" 
                        required 
                      />
                      <Field 
                        label="Email Address" 
                        type="email"
                        value={passengerForm.email} 
                        onChange={updatePassengerField('email')} 
                        icon={<Mail className="h-4 w-4" />} 
                        placeholder="name@example.ng" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="Date of Birth" 
                        type="date"
                        value={passengerForm.dateOfBirth} 
                        onChange={updatePassengerField('dateOfBirth')} 
                      />
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-bold text-slate-300">Gender</span>
                        <select 
                          value={passengerForm.gender} 
                          onChange={updatePassengerField('gender')}
                          className="w-full rounded-xl border border-emerald-700/55 bg-emerald-950/70 p-3 text-xs text-white outline-none focus:border-emerald-400"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                    </div>

                    <Field 
                      label="Residential Address" 
                      value={passengerForm.address} 
                      onChange={updatePassengerField('address')} 
                      icon={<MapPin className="h-4 w-4" />} 
                      placeholder="15 Admiralty Way, Lekki" 
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="State *" 
                        value={passengerForm.state} 
                        onChange={updatePassengerField('state')} 
                        placeholder="Lagos" 
                        required 
                      />
                      <Field 
                        label="City *" 
                        value={passengerForm.city} 
                        onChange={updatePassengerField('city')} 
                        placeholder="Lagos Island" 
                        required 
                      />
                    </div>
                  </div>

                  {/* Section 2: Account Information with Show/Hide Password */}
                  <div className="space-y-3 pt-3 border-t border-emerald-800/40">
                    <span className="block text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                      2. Account Information
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="Password *" 
                        type="password"
                        value={passengerForm.password} 
                        onChange={updatePassengerField('password')} 
                        icon={<LockKeyhole className="h-4 w-4" />}
                        placeholder="Min 6 characters" 
                        required 
                      />
                      <Field 
                        label="Confirm Password *" 
                        type="password"
                        value={passengerForm.confirmPassword} 
                        onChange={updatePassengerField('confirmPassword')} 
                        icon={<LockKeyhole className="h-4 w-4" />}
                        placeholder="Re-enter password" 
                        required 
                      />
                    </div>
                  </div>

                  {/* Section 3: Profile Photograph */}
                  <div className="space-y-2 pt-3 border-t border-emerald-800/40">
                    <span className="block text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                      3. Profile Photograph
                    </span>

                    <div className="flex items-center gap-4 rounded-2xl border border-emerald-700/50 bg-emerald-950/60 p-3">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-900/60 border border-emerald-600/50 flex items-center justify-center overflow-hidden shrink-0">
                        {passengerForm.profilePhoto ? (
                          <img src={passengerForm.profilePhoto} alt="Profile Preview" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors">
                          <Upload className="h-3.5 w-3.5" /> Upload Photo
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                        <p className="mt-1 text-[10px] text-slate-400">JPG or PNG image under 5MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Emergency Information */}
                  <div className="space-y-3 pt-3 border-t border-emerald-800/40">
                    <span className="block text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                      4. Emergency Contact Information
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="Emergency Contact Name *" 
                        value={passengerForm.emergencyContactName} 
                        onChange={updatePassengerField('emergencyContactName')} 
                        placeholder="Amina Okafor" 
                        required 
                      />
                      <Field 
                        label="Emergency Phone Number *" 
                        type="tel"
                        value={passengerForm.emergencyContactPhone} 
                        onChange={updatePassengerField('emergencyContactPhone')} 
                        placeholder="+234 802 345 6789" 
                        required 
                      />
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold text-slate-300">Relationship to Passenger *</span>
                      <select 
                        value={passengerForm.emergencyContactRelationship} 
                        onChange={updatePassengerField('emergencyContactRelationship')}
                        className="w-full rounded-xl border border-emerald-700/55 bg-emerald-950/70 p-3 text-xs text-white outline-none focus:border-emerald-400"
                      >
                        <option value="Parent">Parent</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Friend">Friend</option>
                        <option value="Relative">Relative</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="pt-3 border-t border-emerald-800/40">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                      <input 
                        type="checkbox"
                        checked={passengerForm.agreedToTerms}
                        onChange={updatePassengerField('agreedToTerms')}
                        className="mt-0.5 h-4 w-4 accent-emerald-500 rounded"
                        required
                      />
                      <span>
                        I agree to NIBOLODA’s <strong className="text-emerald-400">Terms of Service</strong> and <strong className="text-emerald-400">Privacy Policy</strong>.
                      </span>
                    </label>
                  </div>

                  {error && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={submitting || !passengerForm.agreedToTerms}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/50 transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50"
                  >
                    {submitting ? 'Registering Passenger…' : 'SUBMIT PASSENGER REGISTRATION'} <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => setViewMode('LOGIN')} 
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Already registered? Sign in
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. PILOT / DRIVER REGISTRATION FORM */}
            {viewMode === 'DRIVER_REG' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold tracking-[.18em] text-amber-400 uppercase">
                      PILOT / DRIVER ONBOARDING
                    </span>
                    <h2 className="mt-1 font-outfit text-2xl font-extrabold text-white">
                      Driver Registration
                    </h2>
                  </div>
                  <button
                    onClick={() => setViewMode('LANDING')}
                    className="text-xs font-bold text-slate-400 hover:text-white inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                </div>

                <form onSubmit={handleDriverSubmit} className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
                  
                  {/* Section 1: Personal Details */}
                  <div className="space-y-3">
                    <span className="block text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                      1. Personal Information
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="First Name *" 
                        value={driverForm.firstName} 
                        onChange={updateDriverField('firstName')} 
                        icon={<User className="h-4 w-4" />} 
                        placeholder="Emeka" 
                        required 
                      />
                      <Field 
                        label="Last Name *" 
                        value={driverForm.lastName} 
                        onChange={updateDriverField('lastName')} 
                        icon={<User className="h-4 w-4" />} 
                        placeholder="Okafor" 
                        required 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="Phone Number *" 
                        type="tel"
                        value={driverForm.phone} 
                        onChange={updateDriverField('phone')} 
                        icon={<Phone className="h-4 w-4" />} 
                        placeholder="+234 803 123 4567" 
                        required 
                      />
                      <Field 
                        label="Email Address" 
                        type="email"
                        value={driverForm.email} 
                        onChange={updateDriverField('email')} 
                        icon={<Mail className="h-4 w-4" />} 
                        placeholder="driver@example.ng" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="Date of Birth" 
                        type="date"
                        value={driverForm.dateOfBirth} 
                        onChange={updateDriverField('dateOfBirth')} 
                      />
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-bold text-slate-300">Gender</span>
                        <select 
                          value={driverForm.gender} 
                          onChange={updateDriverField('gender')}
                          className="w-full rounded-xl border border-emerald-700/55 bg-emerald-950/70 p-3 text-xs text-white outline-none focus:border-emerald-400"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </label>
                    </div>

                    <Field 
                      label="Driver License Number *" 
                      value={driverForm.licenseNumber} 
                      onChange={updateDriverField('licenseNumber')} 
                      icon={<Shield className="h-4 w-4" />} 
                      placeholder="DL-987654321" 
                      required 
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="State *" 
                        value={driverForm.state} 
                        onChange={updateDriverField('state')} 
                        placeholder="Lagos" 
                        required 
                      />
                      <Field 
                        label="City *" 
                        value={driverForm.city} 
                        onChange={updateDriverField('city')} 
                        placeholder="Lagos Island" 
                        required 
                      />
                    </div>
                  </div>

                  {/* Section 2: Vehicle Details */}
                  <div className="space-y-3 pt-3 border-t border-emerald-800/40">
                    <span className="block text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                      2. Primary Vehicle Details
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="Vehicle Make *" 
                        value={driverForm.vehicleMake} 
                        onChange={updateDriverField('vehicleMake')} 
                        icon={<Car className="h-4 w-4" />} 
                        placeholder="Toyota" 
                        required 
                      />
                      <Field 
                        label="Vehicle Model *" 
                        value={driverForm.vehicleModel} 
                        onChange={updateDriverField('vehicleModel')} 
                        placeholder="Corolla" 
                        required 
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Field 
                        label="Year *" 
                        type="number"
                        value={driverForm.vehicleYear} 
                        onChange={updateDriverField('vehicleYear')} 
                        placeholder="2020" 
                        required 
                      />
                      <Field 
                        label="Color *" 
                        value={driverForm.vehicleColor} 
                        onChange={updateDriverField('vehicleColor')} 
                        placeholder="Silver" 
                        required 
                      />
                      <Field 
                        label="License Plate *" 
                        value={driverForm.vehiclePlate} 
                        onChange={updateDriverField('vehiclePlate')} 
                        placeholder="KJA-123AA" 
                        required 
                      />
                    </div>
                  </div>

                  {/* Section 3: Password */}
                  <div className="space-y-3 pt-3 border-t border-emerald-800/40">
                    <span className="block text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                      3. Account Password
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <Field 
                        label="Password *" 
                        type="password"
                        value={driverForm.password} 
                        onChange={updateDriverField('password')} 
                        icon={<LockKeyhole className="h-4 w-4" />}
                        placeholder="Min 6 characters" 
                        required 
                      />
                      <Field 
                        label="Confirm Password *" 
                        type="password"
                        value={driverForm.confirmPassword} 
                        onChange={updateDriverField('confirmPassword')} 
                        icon={<LockKeyhole className="h-4 w-4" />}
                        placeholder="Re-enter password" 
                        required 
                      />
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="pt-3 border-t border-emerald-800/40">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                      <input 
                        type="checkbox"
                        checked={driverForm.agreedToTerms}
                        onChange={updateDriverField('agreedToTerms')}
                        className="mt-0.5 h-4 w-4 accent-amber-500 rounded"
                        required
                      />
                      <span>
                        I agree to NIBOLODA’s <strong className="text-amber-400">Driver Partner Terms</strong> and 0% commission guidelines.
                      </span>
                    </label>
                  </div>

                  {error && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={submitting || !driverForm.agreedToTerms}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-950/50 transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
                  >
                    {submitting ? 'Registering Pilot…' : 'SUBMIT PILOT / DRIVER REGISTRATION'} <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => setViewMode('LOGIN')} 
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Already registered? Sign in
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. LOGIN SCREEN WITH FORGOT PASSWORD & PASSWORD SHOW/HIDE */}
            {viewMode === 'LOGIN' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <span className="text-[11px] font-extrabold tracking-[.18em] text-emerald-400 uppercase">
                    NIBOLODA ACCESS
                  </span>
                  <h2 className="mt-1 font-outfit text-2xl font-extrabold text-white">
                    Sign in to Your Account
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Select your account role and enter your login credentials:
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] font-bold text-slate-300">Account Type</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        onClick={() => setLoginForm((prev) => ({ ...prev, role: 'PASSENGER' }))}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          loginForm.role === 'PASSENGER'
                            ? 'border-emerald-400 bg-emerald-500/15 text-white'
                            : 'border-emerald-800/70 bg-emerald-950/45 text-slate-400'
                        }`}
                      >
                        <Compass className="h-4 w-4 text-emerald-400 mb-1" />
                        <span className="block text-xs font-bold">Passenger</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setLoginForm((prev) => ({ ...prev, role: 'DRIVER' }))}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          loginForm.role === 'DRIVER'
                            ? 'border-amber-400 bg-amber-500/15 text-white'
                            : 'border-emerald-800/70 bg-emerald-950/45 text-slate-400'
                        }`}
                      >
                        <Car className="h-4 w-4 text-amber-400 mb-1" />
                        <span className="block text-xs font-bold">Pilot / Driver</span>
                      </button>
                    </div>
                  </div>

                  <Field 
                    label="Phone Number or Email" 
                    value={loginForm.phoneOrEmail} 
                    onChange={updateLoginField('phoneOrEmail')} 
                    icon={<UserRound className="h-4 w-4" />} 
                    placeholder="+234 801 234 5678" 
                    required 
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-300">Password</span>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotForm({ phoneOrEmail: loginForm.phoneOrEmail });
                          setError('');
                          setViewMode('FORGOT_PASSWORD');
                        }}
                        className="text-[11px] font-bold text-amber-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <Field 
                      label="" 
                      type="password"
                      value={loginForm.password} 
                      onChange={updateLoginField('password')} 
                      icon={<LockKeyhole className="h-4 w-4" />} 
                      placeholder="Enter your password" 
                      required 
                    />
                  </div>

                  {error && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-900/60 p-3 text-xs text-emerald-300">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/50 transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50"
                  >
                    {submitting ? 'Signing in…' : `SIGN IN AS ${loginForm.role === 'DRIVER' ? 'PILOT' : 'PASSENGER'}`} <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => setViewMode('LANDING')} 
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Need an account? Register here
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. FORGOT PASSWORD SCREEN */}
            {viewMode === 'FORGOT_PASSWORD' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <span className="text-[11px] font-extrabold tracking-[.18em] text-amber-400 uppercase">
                    ACCOUNT RECOVERY
                  </span>
                  <h2 className="mt-1 font-outfit text-2xl font-extrabold text-white">
                    Reset Your Password
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Enter your registered phone number or email address. We will generate a 4-digit code to verify your identity.
                  </p>
                </div>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <Field 
                    label="Registered Phone Number or Email *" 
                    value={forgotForm.phoneOrEmail} 
                    onChange={(e) => setForgotForm({ phoneOrEmail: e.target.value })} 
                    icon={<UserRound className="h-4 w-4" />} 
                    placeholder="+234 803 123 4567 or email@domain.com" 
                    required 
                  />

                  {error && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-950/50 transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
                  >
                    {submitting ? 'Generating 4-Digit Code…' : 'SEND 4-DIGIT RESET CODE'} <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => setViewMode('LOGIN')} 
                      className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign in
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 5. RESET PASSWORD WITH 4-DIGIT CODE & NEW PASSWORD */}
            {viewMode === 'RESET_PASSWORD' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <span className="text-[11px] font-extrabold tracking-[.18em] text-emerald-400 uppercase">
                    STEP 2 OF 2
                  </span>
                  <h2 className="mt-1 font-outfit text-2xl font-extrabold text-white">
                    Enter Verification Code & New Password
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    A 4-digit password reset verification code has been dispatched to <strong className="text-emerald-400">{resetForm.phoneOrEmail}</strong>. Please check your email inbox and phone messages.
                  </p>
                </div>

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <Field 
                    label="4-Digit Verification Code *" 
                    value={resetForm.otpCode} 
                    onChange={(e) => setResetForm((prev) => ({ ...prev, otpCode: e.target.value }))} 
                    icon={<KeyRound className="h-4 w-4" />} 
                    placeholder="Enter 4-digit code" 
                    maxLength={4}
                    required 
                  />

                  <Field 
                    label="New Password *" 
                    type="password"
                    value={resetForm.newPassword} 
                    onChange={(e) => setResetForm((prev) => ({ ...prev, newPassword: e.target.value }))} 
                    icon={<LockKeyhole className="h-4 w-4" />} 
                    placeholder="Min 6 characters" 
                    required 
                  />

                  <Field 
                    label="Confirm New Password *" 
                    type="password"
                    value={resetForm.confirmPassword} 
                    onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} 
                    icon={<LockKeyhole className="h-4 w-4" />} 
                    placeholder="Re-enter new password" 
                    required 
                  />

                  {error && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/50 transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50"
                  >
                    {submitting ? 'Updating Password…' : 'CONFIRM & SAVE NEW PASSWORD'} <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => setViewMode('LOGIN')} 
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel & Return to Sign in
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 6. OTP 4-DIGIT ACCOUNT CONFIRMATION */}
            {viewMode === 'OTP' && (
              <div className="space-y-6 animate-in fade-in">
                <div>
                  <span className="text-[11px] font-extrabold tracking-[.18em] text-amber-400 uppercase">
                    ACCOUNT CONFIRMATION
                  </span>
                  <h2 className="mt-1 font-outfit text-2xl font-extrabold text-white">
                    Enter 4-Digit Confirmation Code
                  </h2>
                  <p className="mt-1 text-xs text-slate-300">
                    We sent a 4-digit confirmation code to{' '}
                    <strong className="text-emerald-400">
                      {pendingAuth?.email && pendingAuth?.phone
                        ? `your email (${pendingAuth.email}) and phone (${pendingAuth.phone})`
                        : pendingAuth?.email
                        ? `your email address (${pendingAuth.email})`
                        : pendingAuth?.phone
                        ? `your phone number (${pendingAuth.phone})`
                        : 'your registered contact info'}
                    </strong>.
                  </p>
                </div>

                {/* Prominent 4-Digit Code Banner */}
                <div className="rounded-2xl border border-amber-500/40 bg-amber-950/60 p-4 text-center space-y-1 shadow-inner">
                  <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest block">
                    ⚡ YOUR 4-DIGIT CONFIRMATION CODE
                  </span>
                  <div className="text-3xl font-mono font-black text-amber-300 tracking-[0.4em] py-1">
                    {pendingAuth?.otpCode || otpInput || '1234'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter this 4-digit number below to activate your account instantly.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                  <Field 
                    label="4-Digit Confirmation Code *" 
                    value={otpInput} 
                    onChange={(e) => setOtpInput(e.target.value)} 
                    icon={<KeyRound className="h-4 w-4" />} 
                    placeholder="Enter 4-digit code" 
                    maxLength={4}
                    required 
                  />

                  {error && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/60 p-3 text-xs text-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-900/60 p-3 text-xs text-emerald-300">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-950/50 transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50"
                  >
                    {submitting ? 'Confirming…' : 'CONFIRM & ACTIVATE ACCOUNT'} <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button 
                      type="button" 
                      onClick={() => setViewMode('PASSENGER_REG')} 
                      className="text-slate-400 hover:text-white"
                    >
                      ← Edit details
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className="font-bold text-emerald-400 hover:underline disabled:text-slate-600"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend 4-digit code'}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

          <p className="mt-6 text-center text-[10px] leading-5 text-slate-500">
            By continuing, you agree to NIBOLODA’s platform terms, passenger guidelines, and privacy policy.
          </p>
        </div>

      </div>
    </section>
  );
};

// Reusable Field component with Built-in Password Show/Hide Toggle Button
const Field = ({ label, icon, type = "text", ...inputProps }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const actualType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[11px] font-bold text-slate-300">{label}</span>}
      <span className="flex items-center gap-2 rounded-xl border border-emerald-700/55 bg-emerald-950/70 px-3 text-emerald-400 focus-within:border-emerald-400 transition-colors">
        {icon}
        <input 
          className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600" 
          type={actualType}
          {...inputProps} 
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1 text-slate-400 hover:text-emerald-300 transition-colors focus:outline-none"
            tabIndex={-1}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </span>
    </label>
  );
};
