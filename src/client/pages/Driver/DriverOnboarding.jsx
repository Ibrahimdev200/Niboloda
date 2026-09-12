import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowLeft, 
  Upload, 
  Car, 
  User, 
  MapPin, 
  DollarSign, 
  ArrowRight,
  AlertCircle,
  Sparkles,
  Check,
  Building,
  HelpCircle
} from 'lucide-react';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Minivan', 'Bus', 'Other'];
const GOVT_ID_TYPES = ['NIN', 'VOTERS_CARD', 'PASSPORT', 'NATIONAL_ID'];

export const DriverOnboarding = ({ onBack }) => {
  const { token, user } = useAuth();
  
  // Current Wizard Step: 1 to 6
  const [currentStep, setCurrentStep] = useState(1);
  const [driver, setDriver] = useState(null);
  
  // STEP 1 — PERSONAL INFORMATION
  const [step1, setStep1] = useState({
    firstName: user?.driver?.firstName || '',
    lastName: user?.driver?.lastName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    dateOfBirth: '',
    gender: 'Male',
    address: '',
    state: 'Lagos',
    city: 'Lagos',
    profilePhoto: ''
  });

  // STEP 2 — IDENTITY INFORMATION
  const [step2, setStep2] = useState({
    governmentIdType: 'NIN',
    governmentIdNumber: '',
    governmentIdDocUrl: '',
    licenseNumber: '',
    licenseDocUrl: ''
  });

  // STEP 3 — VEHICLE INFORMATION
  const [step3, setStep3] = useState({
    make: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: 'Silver',
    plateNumber: '',
    vehicleType: 'Sedan',
    seats: 4
  });

  // STEP 4 — VEHICLE DOCUMENTS
  const [step4, setStep4] = useState({
    registrationDocUrl: '',
    insuranceDocUrl: '',
    roadworthinessDocUrl: '',
    photoFrontUrl: '',
    photoRearUrl: '',
    photoInteriorUrl: ''
  });

  // STEP 5 — DRIVER SERVICE INFORMATION
  const [step5, setStep5] = useState({
    preferredCity: 'Lagos',
    serviceAreas: 'Lagos Island, Victoria Island, Ikoyi, Lekki, Ikeja',
    maxServiceRadiusKm: 30,
    preferredWorkingHours: 'Full-time (7:00 AM - 9:00 PM)'
  });

  // STEP 6 — DRIVER PRICING
  const [step6, setStep6] = useState({
    minFare: 2500,
    preferredFare: 3000,
    pricePerKm: 300,
    pricePerMin: 50
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDriverProfile();
  }, [token]);

  const fetchDriverProfile = async () => {
    try {
      const res = await fetch('/api/drivers/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.driver) {
        setDriver(data.driver);
        if (data.driver.address) setStep1((prev) => ({ ...prev, address: data.driver.address }));
        if (data.driver.licenseNumber) setStep2((prev) => ({ ...prev, licenseNumber: data.driver.licenseNumber }));
        if (data.driver.vehicle) {
          setStep3({
            make: data.driver.vehicle.make || 'Toyota',
            model: data.driver.vehicle.model || 'Corolla',
            year: data.driver.vehicle.year || 2020,
            color: data.driver.vehicle.color || 'Silver',
            plateNumber: data.driver.vehicle.plateNumber || '',
            vehicleType: data.driver.vehicle.vehicleType || 'Sedan',
            seats: data.driver.vehicle.seats || 4
          });
        }
        if (data.driver.pricing) {
          setStep6({
            minFare: data.driver.pricing.minFare || 2500,
            preferredFare: data.driver.pricing.preferredFare || 3000,
            pricePerKm: data.driver.pricing.pricePerKm || 300,
            pricePerMin: data.driver.pricing.pricePerMin || 50
          });
        }
      }
    } catch (err) {
      console.error('Fetch driver onboarding profile error:', err);
    }
  };

  // Document File Upload Handler
  const handleFileUpload = (targetKey, setter) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Invalid file type. Only JPG, PNG, and PDF documents are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB limit.');
      return;
    }

    setUploadingDoc(targetKey);
    setError('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/uploads/document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            docType: targetKey.toUpperCase(),
            fileName: file.name,
            mimeType: file.type,
            base64Data: reader.result
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        setter((prev) => ({ ...prev, [targetKey]: data.fileUrl }));
      } catch (err) {
        setError(err.message || 'File upload failed');
      } finally {
        setUploadingDoc('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Next Step Validation
  const handleNextStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!step1.firstName || !step1.lastName || !step1.address || !step1.state || !step1.city) {
        setError('Please fill in all required personal information fields.');
        return;
      }
    } else if (currentStep === 2) {
      if (!step2.governmentIdNumber || !step2.licenseNumber) {
        setError('Please enter your Government ID number and Driver’s License number.');
        return;
      }
    } else if (currentStep === 3) {
      if (!step3.make || !step3.model || !step3.plateNumber) {
        setError('Please provide complete vehicle make, model, and license plate number.');
        return;
      }
    } else if (currentStep === 6) {
      if (step6.minFare < 0 || step6.preferredFare < 0 || step6.pricePerKm < 0 || step6.pricePerMin < 0) {
        setError('Pricing values cannot be negative numbers.');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  // Complete Onboarding Submission
  const handleCompleteSubmission = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (step6.minFare < 0 || step6.preferredFare < 0 || step6.pricePerKm < 0 || step6.pricePerMin < 0) {
      setError('Pricing values cannot be negative numbers.');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Submit Driver Profile & Identity Info
      await fetch('/api/drivers/documents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          address: step1.address,
          state: step1.state,
          city: step1.city,
          dateOfBirth: step1.dateOfBirth,
          gender: step1.gender,
          governmentIdType: step2.governmentIdType,
          governmentIdNumber: step2.governmentIdNumber,
          governmentIdDocUrl: step2.governmentIdDocUrl,
          licenseNumber: step2.licenseNumber,
          licenseDocUrl: step2.licenseDocUrl,
          preferredCity: step5.preferredCity,
          serviceAreas: step5.serviceAreas,
          maxServiceRadiusKm: parseFloat(step5.maxServiceRadiusKm) || 30,
          preferredWorkingHours: step5.preferredWorkingHours,
          profilePhoto: step1.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
        })
      });

      // 2. Submit Vehicle Details & Documents
      await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          make: step3.make,
          model: step3.model,
          year: parseInt(step3.year) || 2020,
          color: step3.color,
          plateNumber: step3.plateNumber.toUpperCase(),
          vehicleType: step3.vehicleType,
          seats: parseInt(step3.seats) || 4,
          registrationDocUrl: step4.registrationDocUrl,
          insuranceDocUrl: step4.insuranceDocUrl,
          roadworthinessDocUrl: step4.roadworthinessDocUrl,
          photoFrontUrl: step4.photoFrontUrl,
          photoRearUrl: step4.photoRearUrl,
          photoInteriorUrl: step4.photoInteriorUrl,
          photoUrl: step4.photoFrontUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80'
        })
      });

      // 3. Submit Pricing Configuration
      await fetch('/api/drivers/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(step6)
      });

      setSubmittedMessage('Your application has been submitted and is awaiting verification.');
      fetchDriverProfile();
    } catch (err) {
      setError(err.message || 'Submission failed. Please check your data and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs text-emerald-400 hover:text-white font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Driver Dashboard</span>
        </button>
      )}

      {/* Verification Status Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-700/50 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase">
              PILOT VERIFICATION PIPELINE
            </span>
            <h2 className="text-2xl font-extrabold text-white font-outfit mt-0.5">
              Driver & Vehicle Onboarding
            </h2>
            <p className="text-xs text-slate-300">
              Submit your government identity, driver license, vehicle documents, and initial pricing rules.
            </p>
          </div>

          <div>
            {driver?.verificationStatus === 'APPROVED' && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ACCOUNT APPROVED
              </span>
            )}
            {(driver?.verificationStatus === 'PENDING_VERIFICATION' || driver?.verificationStatus === 'PENDING' || !driver) && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" /> PENDING VERIFICATION
              </span>
            )}
            {driver?.verificationStatus === 'REJECTED' && (
              <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-400" /> VERIFICATION REJECTED
              </span>
            )}
            {driver?.verificationStatus === 'SUSPENDED' && (
              <span className="bg-red-900/40 text-red-400 border border-red-700/60 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-400" /> ACCOUNT SUSPENDED
              </span>
            )}
          </div>
        </div>

        {submittedMessage && (
          <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-amber-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{submittedMessage}</span>
          </div>
        )}
      </div>

      {/* Multi-Step Wizard Navigation Indicator */}
      <div className="glass-panel p-4 rounded-2xl border border-emerald-700/40 shadow-lg">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
          <span>Step {currentStep} of 6</span>
          <span className="text-emerald-400">
            {currentStep === 1 && '1. Personal Information'}
            {currentStep === 2 && '2. Identity Documents'}
            {currentStep === 3 && '3. Vehicle Details'}
            {currentStep === 4 && '4. Vehicle Documents & Photos'}
            {currentStep === 5 && '5. Service Configuration'}
            {currentStep === 6 && '6. Pricing Configuration'}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setCurrentStep(st)}
              className={`h-2 rounded-full transition-all ${
                st === currentStep 
                  ? 'bg-emerald-400 shadow-glow' 
                  : st < currentStep 
                    ? 'bg-emerald-600' 
                    : 'bg-emerald-950 border border-emerald-800/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Multi-Step Form Container */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-700/50 shadow-2xl space-y-6">
        
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-950/60 p-4 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCompleteSubmission} className="space-y-6">

          {/* STEP 1 — PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-outfit border-b border-emerald-800/40 pb-3">
                <User className="w-5 h-5 text-emerald-400" /> Step 1: Personal Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">First Name *</label>
                  <input
                    type="text"
                    value={step1.firstName}
                    onChange={(e) => setStep1({ ...step1, firstName: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={step1.lastName}
                    onChange={(e) => setStep1({ ...step1, lastName: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={step1.phone}
                    onChange={(e) => setStep1({ ...step1, phone: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={step1.email}
                    onChange={(e) => setStep1({ ...step1, email: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={step1.dateOfBirth}
                    onChange={(e) => setStep1({ ...step1, dateOfBirth: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Gender *</label>
                  <select
                    value={step1.gender}
                    onChange={(e) => setStep1({ ...step1, gender: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Residential Address *</label>
                <input
                  type="text"
                  value={step1.address}
                  onChange={(e) => setStep1({ ...step1, address: e.target.value })}
                  className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                  placeholder="e.g. 12 Marina Road, Victoria Island"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">State *</label>
                  <input
                    type="text"
                    value={step1.state}
                    onChange={(e) => setStep1({ ...step1, state: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">City *</label>
                  <input
                    type="text"
                    value={step1.city}
                    onChange={(e) => setStep1({ ...step1, city: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — IDENTITY INFORMATION & DOCUMENTS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-outfit border-b border-emerald-800/40 pb-3">
                <FileText className="w-5 h-5 text-emerald-400" /> Step 2: Identity Documents
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Government ID Type *</label>
                  <select
                    value={step2.governmentIdType}
                    onChange={(e) => setStep2({ ...step2, governmentIdType: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                  >
                    {GOVT_ID_TYPES.map((type) => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Government ID Number *</label>
                  <input
                    type="text"
                    value={step2.governmentIdNumber}
                    onChange={(e) => setStep2({ ...step2, governmentIdNumber: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    placeholder="e.g. NIN-90812310"
                    required
                  />
                </div>
              </div>

              {/* Upload Govt ID */}
              <DocUploadBox
                label="Government ID Document (JPG, PNG, PDF max 5MB)"
                docKey="governmentIdDocUrl"
                value={step2.governmentIdDocUrl}
                isUploading={uploadingDoc === 'governmentIdDocUrl'}
                onUpload={handleFileUpload('governmentIdDocUrl', setStep2)}
              />

              <div className="pt-2 border-t border-emerald-800/40">
                <label className="text-xs font-bold text-slate-300 block mb-1">Driver's License Number *</label>
                <input
                  type="text"
                  value={step2.licenseNumber}
                  onChange={(e) => setStep2({ ...step2, licenseNumber: e.target.value })}
                  className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white uppercase outline-none focus:border-emerald-400"
                  placeholder="e.g. NIG-DL-98210"
                  required
                />
              </div>

              {/* Upload License Doc */}
              <DocUploadBox
                label="Driver's License Document (JPG, PNG, PDF max 5MB)"
                docKey="licenseDocUrl"
                value={step2.licenseDocUrl}
                isUploading={uploadingDoc === 'licenseDocUrl'}
                onUpload={handleFileUpload('licenseDocUrl', setStep2)}
              />
            </div>
          )}

          {/* STEP 3 — VEHICLE INFORMATION */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-outfit border-b border-emerald-800/40 pb-3">
                <Car className="w-5 h-5 text-amber-400" /> Step 3: Vehicle Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Vehicle Make *</label>
                  <input
                    type="text"
                    value={step3.make}
                    onChange={(e) => setStep3({ ...step3, make: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    placeholder="Toyota"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Vehicle Model *</label>
                  <input
                    type="text"
                    value={step3.model}
                    onChange={(e) => setStep3({ ...step3, model: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    placeholder="Corolla"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Year *</label>
                  <input
                    type="number"
                    value={step3.year}
                    onChange={(e) => setStep3({ ...step3, year: parseInt(e.target.value) || 2020 })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Vehicle Color *</label>
                  <input
                    type="text"
                    value={step3.color}
                    onChange={(e) => setStep3({ ...step3, color: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    placeholder="Silver"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">License Plate Number *</label>
                  <input
                    type="text"
                    value={step3.plateNumber}
                    onChange={(e) => setStep3({ ...step3, plateNumber: e.target.value.toUpperCase() })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white font-mono uppercase outline-none focus:border-amber-400"
                    placeholder="ABC-123-XY"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Vehicle Type *</label>
                  <select
                    value={step3.vehicleType}
                    onChange={(e) => setStep3({ ...step3, vehicleType: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                  >
                    {VEHICLE_TYPES.map((vt) => (
                      <option key={vt} value={vt}>{vt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Number of Passenger Seats *</label>
                <input
                  type="number"
                  value={step3.seats}
                  onChange={(e) => setStep3({ ...step3, seats: parseInt(e.target.value) || 4 })}
                  className="w-full sm:w-1/2 bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                  min="1"
                  max="50"
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 4 — VEHICLE DOCUMENTS & PHOTOGRAPHS */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-outfit border-b border-emerald-800/40 pb-3">
                <FileText className="w-5 h-5 text-emerald-400" /> Step 4: Vehicle Documents & Photographs
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DocUploadBox
                  label="Vehicle Registration Document"
                  docKey="registrationDocUrl"
                  value={step4.registrationDocUrl}
                  isUploading={uploadingDoc === 'registrationDocUrl'}
                  onUpload={handleFileUpload('registrationDocUrl', setStep4)}
                />
                <DocUploadBox
                  label="Vehicle Insurance Document"
                  docKey="insuranceDocUrl"
                  value={step4.insuranceDocUrl}
                  isUploading={uploadingDoc === 'insuranceDocUrl'}
                  onUpload={handleFileUpload('insuranceDocUrl', setStep4)}
                />
                <DocUploadBox
                  label="Roadworthiness Certificate"
                  docKey="roadworthinessDocUrl"
                  value={step4.roadworthinessDocUrl}
                  isUploading={uploadingDoc === 'roadworthinessDocUrl'}
                  onUpload={handleFileUpload('roadworthinessDocUrl', setStep4)}
                />
                <DocUploadBox
                  label="Vehicle Photo — Front View"
                  docKey="photoFrontUrl"
                  value={step4.photoFrontUrl}
                  isUploading={uploadingDoc === 'photoFrontUrl'}
                  onUpload={handleFileUpload('photoFrontUrl', setStep4)}
                />
                <DocUploadBox
                  label="Vehicle Photo — Rear View"
                  docKey="photoRearUrl"
                  value={step4.photoRearUrl}
                  isUploading={uploadingDoc === 'photoRearUrl'}
                  onUpload={handleFileUpload('photoRearUrl', setStep4)}
                />
                <DocUploadBox
                  label="Vehicle Photo — Interior View"
                  docKey="photoInteriorUrl"
                  value={step4.photoInteriorUrl}
                  isUploading={uploadingDoc === 'photoInteriorUrl'}
                  onUpload={handleFileUpload('photoInteriorUrl', setStep4)}
                />
              </div>
            </div>
          )}

          {/* STEP 5 — DRIVER SERVICE INFORMATION */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-outfit border-b border-emerald-800/40 pb-3">
                <Building className="w-5 h-5 text-emerald-400" /> Step 5: Service Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Preferred Operating City *</label>
                  <input
                    type="text"
                    value={step5.preferredCity}
                    onChange={(e) => setStep5({ ...step5, preferredCity: e.target.value })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Maximum Service Radius (KM) *</label>
                  <input
                    type="number"
                    value={step5.maxServiceRadiusKm}
                    onChange={(e) => setStep5({ ...step5, maxServiceRadiusKm: parseFloat(e.target.value) || 30 })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    min="1"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Service Areas / Neighborhoods *</label>
                <input
                  type="text"
                  value={step5.serviceAreas}
                  onChange={(e) => setStep5({ ...step5, serviceAreas: e.target.value })}
                  className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                  placeholder="e.g. Victoria Island, Ikoyi, Lekki Phase 1, Ikeja, Surulere"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Preferred Working Hours *</label>
                <input
                  type="text"
                  value={step5.preferredWorkingHours}
                  onChange={(e) => setStep5({ ...step5, preferredWorkingHours: e.target.value })}
                  className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                  placeholder="e.g. Mon-Fri (6:00 AM - 8:00 PM)"
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 6 — DRIVER PRICING SETUP */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-outfit border-b border-emerald-800/40 pb-3">
                <DollarSign className="w-5 h-5 text-amber-400" /> Step 6: Custom Trip Pricing Setup
              </h3>

              <div className="p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-2xl space-y-2">
                <p className="text-xs text-slate-200 leading-5">
                  <strong className="text-amber-400">Your pricing determines the fare passengers see when choosing you.</strong><br />
                  NIBOLODA takes strictly <strong className="text-emerald-400">0% trip commission</strong>. You keep 100% of the trip fare.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Minimum Trip Fare (NGN) *</label>
                  <input
                    type="number"
                    value={step6.minFare}
                    onChange={(e) => setStep6({ ...step6, minFare: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-amber-400 font-bold outline-none focus:border-amber-400"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Preferred Starting Base Fare (NGN) *</label>
                  <input
                    type="number"
                    value={step6.preferredFare}
                    onChange={(e) => setStep6({ ...step6, preferredFare: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-amber-400 font-bold outline-none focus:border-amber-400"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Price Per KM (NGN) *</label>
                  <input
                    type="number"
                    value={step6.pricePerKm}
                    onChange={(e) => setStep6({ ...step6, pricePerKm: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Price Per Minute (NGN) *</label>
                  <input
                    type="number"
                    value={step6.pricePerMin}
                    onChange={(e) => setStep6({ ...step6, pricePerMin: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-emerald-950 border border-emerald-700/60 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-400"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Sample Fare Calculation Box */}
              <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/80 p-4 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">
                  Live Pricing Example Calculation (10 KM, 20 Mins):
                </span>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Base (₦{step6.preferredFare}) + Distance (10 x ₦{step6.pricePerKm}) + Time (20 x ₦{step6.pricePerMin})</span>
                  <strong className="text-base text-amber-400 font-outfit">
                    ₦{Math.max(step6.minFare, step6.preferredFare + (10 * step6.pricePerKm) + (20 * step6.pricePerMin)).toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Control Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-emerald-800/40">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
                className="px-4 py-2.5 rounded-xl border border-emerald-700/60 text-xs font-bold text-slate-300 hover:text-white"
              >
                ← Back
              </button>
            ) : <div />}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-extrabold text-white shadow-lg"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-500 hover:from-amber-300 hover:to-emerald-400 text-xs font-black text-slate-950 shadow-xl"
              >
                {submitting ? 'Submitting Application…' : 'SUBMIT DRIVER APPLICATION FOR VERIFICATION'} <Upload className="w-4 h-4" />
              </button>
            )}
          </div>

        </form>
      </div>

    </div>
  );
};

// Document Upload Helper Component
const DocUploadBox = ({ label, docKey, value, isUploading, onUpload }) => (
  <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/60 p-4 space-y-2">
    <span className="block text-xs font-bold text-slate-200">{label}</span>
    <div className="flex items-center gap-3">
      <label className="inline-flex items-center gap-2 cursor-pointer rounded-xl bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors shrink-0">
        <Upload className="h-3.5 w-3.5" />
        <span>{isUploading ? 'Uploading...' : value ? 'Replace File' : 'Select File'}</span>
        <input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={onUpload} className="hidden" />
      </label>
      
      {value ? (
        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 truncate">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Uploaded!
        </span>
      ) : (
        <span className="text-[10px] text-slate-500">No file uploaded</span>
      )}
    </div>
  </div>
);
