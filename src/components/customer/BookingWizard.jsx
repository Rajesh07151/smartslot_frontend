import React, { useState, useEffect, useId } from 'react';
import { api } from '../../api';
import { formatINR } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import {
  Wrench, Calendar, Clock, User, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
  Shield, Car, Sparkles, Phone, Mail, FileText, ChevronRight, Check, RefreshCw, QrCode,
  Copy, Download, Printer, X
} from 'lucide-react';

export default function BookingWizard({ onBookingSuccess, onManageBookingClick }) {
  // Wizard steps: 1=Service, 2=Specialist, 3=Date & Slot, 4=Details, 5=Success
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [slotHoldError, setSlotHoldError] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [serverWakingUp, setServerWakingUp] = useState(false);

  // Data
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedServices, setSelectedServices] = useState([]); // Array of selected services (supports multi-service selection)

  // Derived multi-service values
  const selectedService = selectedServices[0] || null;
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const combinedServiceNames = selectedServices.map(s => s.name).join(' + ');
  const serviceIdsParam = selectedServices.map(s => s.id).join(',');

  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('any'); // 'any' or staff.id

  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [availabilityData, setAvailabilityData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [holdInfo, setHoldInfo] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null); // in seconds

  // Checkout session ID for slot reservation and idempotency key
  const [sessionId] = useState(() => 'sess-' + Math.random().toString(36).substring(2, 9));
  const [idempotencyKey] = useState(() => 'idem-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now());

  // Customer form details and inline field validation
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle: '',
    notes: ''
  });
  const [fieldErrors, setFieldErrors] = useState({
    name: null,
    email: null,
    phone: null
  });

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Countdown timer for 5-minute slot hold
  useEffect(() => {
    if (!holdInfo || !holdInfo.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const calcRemaining = () => Math.max(0, Math.floor((holdInfo.expiresAt - Date.now()) / 1000));
    setTimeLeft(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setHoldInfo(null);
        setSelectedSlot(null);
        setError('Your 5-minute temporary slot hold has expired. Please select a slot again to reserve.');
        fetchSlots();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [holdInfo]);

  // Helper to format remaining seconds as mm:ss
  const formatTimeLeft = (seconds) => {
    if (seconds === null || seconds === undefined) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Load services and staff on mount with cold-start detection
  const loadInitialData = async () => {
    let wakeUpTimer = null;
    try {
      setLoading(true);
      setError(null);
      setServerWakingUp(false);

      wakeUpTimer = setTimeout(() => {
        setServerWakingUp(true);
      }, 3500);

      const [servicesData, staffData] = await Promise.all([
        api.getServices(),
        api.getStaff()
      ]);

      if (wakeUpTimer) clearTimeout(wakeUpTimer);
      setServices(servicesData);
      setStaffList(staffData);
      setServerWakingUp(false);
    } catch (err) {
      if (wakeUpTimer) clearTimeout(wakeUpTimer);
      setServerWakingUp(false);
      setError('Unable to reach SmartSlot server. Please ensure the backend server is running on port 5000.');
    } finally {
      if (wakeUpTimer) clearTimeout(wakeUpTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Always reload live technicians from database when entering Step 2
  useEffect(() => {
    if (step === 2) {
      api.getStaff()
        .then(staffData => setStaffList(staffData))
        .catch(err => console.error('Failed to refresh staff:', err));
    }
  }, [step]);

  // Fetch slot availability when services, staff, or date changes
  useEffect(() => {
    if (selectedServices.length > 0 && selectedDate && step === 3) {
      fetchSlots();
    }
  }, [serviceIdsParam, selectedStaffId, selectedDate, step]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedSlot(null);
      setHoldInfo(null);
      const data = await api.getAvailability(
        serviceIdsParam,
        selectedDate,
        selectedStaffId,
        null,
        sessionId
      );
      setAvailabilityData(data);
    } catch (err) {
      setError(err.message || 'Error fetching available slots');
    } finally {
      setLoading(false);
    }
  };

  // Handle slot selection with temporary hold and error recovery
  const handleSelectSlot = async (slot) => {
    setSelectedSlot(slot);
    setSlotHoldError(null);
    setError(null);
    try {
      const hold = await api.holdSlot({
        serviceId: selectedServices[0]?.id,
        serviceIds: serviceIdsParam,
        staffId: selectedStaffId,
        date: selectedDate,
        startTime: slot.startTime,
        sessionId
      });
      setHoldInfo(hold);
    } catch (err) {
      setSelectedSlot(null);
      setHoldInfo(null);
      const friendlyHoldMsg = err.message || 'This slot was just reserved by another customer or is no longer available. Available times have been refreshed — please select another slot.';
      setSlotHoldError(friendlyHoldMsg);
      fetchSlots();
    }
  };

  const handleCopyReference = (ref) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleDownloadCalendar = (booking) => {
    if (!booking) return;
    const dateParts = (booking.date || '').split('-');
    if (dateParts.length !== 3) return;
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];

    const [sh, sm] = (booking.startTime || '09:00').split(':');
    const [eh, em] = (booking.endTime || '10:00').split(':');

    const dtStart = `${year}${month}${day}T${sh}${sm}00`;
    const dtEnd = `${year}${month}${day}T${eh}${em}00`;

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SmartSlot Workshop//EN',
      'BEGIN:VEVENT',
      `UID:${booking.bookingReference || Date.now()}@smartslot.service`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:SmartSlot Auto Care - ${booking.serviceName || 'Vehicle Service'}`,
      `DESCRIPTION:Booking Reference: ${booking.bookingReference}\\nTechnician: ${booking.staffName || 'Specialist'}\\nVehicle: ${booking.vehicleDetails || 'Standard'}`,
      'LOCATION:SmartSlot Certified Workshop Bay',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartSlot-${booking.bookingReference}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Real-time inline field validation
  const validateField = (name, value) => {
    let err = null;
    if (name === 'name') {
      if (!value || value.trim().length < 2) {
        err = 'Full name is required (minimum 2 characters).';
      }
    }
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value || !emailRegex.test(value.trim())) {
        err = 'Please enter a valid email address (e.g. name@example.com).';
      }
    }
    if (name === 'phone') {
      const cleanPhone = value.replace(/\D/g, '');
      if (!value || cleanPhone.length < 7 || cleanPhone.length > 15) {
        err = 'Please enter a valid mobile number (7 to 15 digits).';
      }
    }
    setFieldErrors(prev => ({ ...prev, [name]: err }));
    return err;
  };

  // Toggle service selection (supports selecting 1, 2, or more services at a time)
  const handleToggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
    setSelectedStaffId('any'); // Reset specialist selection when services change
    setSelectedSlot(null);
    setHoldInfo(null);
  };

  // Submit final booking with Idempotency Key
  const handleConfirmBooking = async (e) => {
    e.preventDefault();

    const nameErr = validateField('name', customerDetails.name);
    const emailErr = validateField('email', customerDetails.email);
    const phoneErr = validateField('phone', customerDetails.phone);

    if (nameErr || emailErr || phoneErr) {
      setError('Please correct the validation errors in your contact details before submitting.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        serviceId: selectedServices[0]?.id,
        serviceIds: serviceIdsParam,
        staffId: selectedStaffId,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        customerName: customerDetails.name.trim(),
        customerEmail: customerDetails.email.trim(),
        customerPhone: customerDetails.phone.trim(),
        vehicleDetails: customerDetails.vehicle.trim(),
        customerNotes: customerDetails.notes.trim(),
        sessionId,
        idempotencyKey
      };

      const result = await api.createAppointment(payload, idempotencyKey);
      setConfirmedBooking(result);
      setStep(5);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onBookingSuccess) onBookingSuccess(result);
    } catch (err) {
      setError(err.message || 'Could not complete booking. Please try another slot.');
    } finally {
      setLoading(false);
    }
  };

  // Filter categories
  const categories = ['All', ...new Set(services.map(s => s.category))];
  const filteredServices = selectedCategory === 'All'
    ? services
    : services.filter(s => s.category === selectedCategory);

  // Filter staff: ONLY show specialists qualified for ALL selected services
  const qualifiedStaff = selectedServices.length > 0
    ? staffList.filter(s => {
        if (!s.services || s.services.length === 0) return false;
        const staffServiceIds = s.services.map(srv => srv.id);
        return selectedServices.every(sel => staffServiceIds.includes(sel.id));
      })
    : staffList;

  // Generate 14-day date options
  const dateOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + (i + 1));
    const iso = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const isSunday = d.getDay() === 0;
    return { iso, dayName, dayNum, month, isSunday };
  });

  const getStaffWorkingSummary = (schedules) => {
    if (!schedules || schedules.length === 0) return 'Regular Bay Hours';
    const workingDays = schedules.filter(s => s.is_working).map(s => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[s.day_of_week];
    });
    if (workingDays.length === 0) return 'Currently Scheduled Off';
    const firstWorking = schedules.find(s => s.is_working) || { start_time: '08:30', end_time: '17:00' };
    return `${workingDays.join(', ')} (${firstWorking.start_time} - ${firstWorking.end_time})`;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Wizard Step Progress Tracker */}
      {step < 5 && (
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0"></div>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-300 z-0"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>

            {[
              { num: 1, label: 'Service' },
              { num: 2, label: 'Specialist' },
              { num: 3, label: 'Date & Time' },
              { num: 4, label: 'Details' }
            ].map(s => (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step === s.num
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-500 border-2 border-slate-300'
                  }`}
                >
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${step === s.num ? 'text-blue-700' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error alert banner (shown during checkout steps or when services are loaded) */}
      {error && (services.length > 0 || step > 1) && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="text-sm">
            <p className="font-semibold">Booking Notice</p>
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700 font-bold">&times;</button>
        </div>
      )}

      {/* STEP 1: SERVICE SELECTION (Multi-Service Support) */}
      {step === 1 && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Select Services</h1>
            <p className="text-slate-500 text-sm mt-1">
              Select one or more services for your appointment. Combine multiple services (e.g. Oil Change + Brake Service) into a single visit.
            </p>
          </div>

          {/* Workshop Server Initializing Banner */}
          {serverWakingUp && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900 animate-fadeIn">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Connecting to SmartSlot Workshop Service...</p>
                <p className="text-blue-700 text-[11px] mt-0.5">
                  Loading real-time technician bay schedules and service packages. Your session will connect automatically.
                </p>
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading Skeleton */}
          {loading && services.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-5 rounded-2xl border border-slate-200 bg-white animate-pulse space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                    <div className="h-5 bg-slate-200 rounded w-16"></div>
                  </div>
                  <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                  <div className="h-8 bg-slate-100 rounded-xl w-full mt-3"></div>
                </div>
              ))}
            </div>
          ) : error && services.length === 0 ? (
            /* Connection Error with Retry Button */
            <div className="py-12 px-6 text-center bg-white rounded-2xl border border-rose-200 shadow-xs">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">Unable to Connect to SmartSlot Service</h3>
              <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
                The workshop scheduling service is temporarily unreachable or re-connecting. Please check your internet connection or click Retry.
              </p>
              <button
                onClick={loadInitialData}
                className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : (
            /* Services Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map(service => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                const selectedIndex = selectedServices.findIndex(s => s.id === service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => handleToggleService(service)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative bg-white hover:shadow-md ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            {service.category}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Added {selectedServices.length > 1 ? `#${selectedIndex + 1}` : ''}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-2">{service.name}</h3>
                        <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{service.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-black text-slate-900">{formatINR(service.price)}</span>
                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-1 justify-end">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{service.duration_minutes}m</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        {service.qualified_technicians_count} Specialists Certified
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleService(service);
                        }}
                        className={`font-semibold px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ Added' : '+ Add Service'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 1 Actions / Selected Services Bar */}
          {selectedServices.length > 0 ? (
            <div className="mt-8 p-4 bg-slate-900 text-white rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
              <div className="w-full sm:w-auto">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
                    {selectedServices.length} {selectedServices.length === 1 ? 'Service Selected' : 'Services Selected'}
                  </span>
                  <span className="text-xs text-slate-300">
                    Combined Time: <strong className="text-white">{totalDuration} mins</strong>
                  </span>
                  <span className="text-xs text-slate-300">
                    Total: <strong className="text-emerald-400 font-bold">{formatINR(totalPrice)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  {selectedServices.map(s => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800 text-xs text-slate-200 border border-slate-700"
                    >
                      <span>{s.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleService(s)}
                        className="text-slate-400 hover:text-rose-400 font-bold cursor-pointer text-sm"
                        title="Remove service"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
              >
                <span>Continue to Specialist ({selectedServices.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="mt-8 flex justify-end">
              <button
                disabled={true}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 opacity-40 cursor-not-allowed transition-all"
              >
                <span>Select At Least 1 Service</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: SPECIALIST SELECTION */}
      {step === 2 && selectedServices.length > 0 && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Choose Your Specialist</h1>
            <p className="text-slate-500 text-sm mt-1">
              Select a certified technician for <span className="font-semibold text-blue-600">{combinedServiceNames}</span> ({totalDuration} mins), or let us auto-assign the best available slot.
            </p>
          </div>

          <div className="space-y-3">
            {/* Option A: Any Available Specialist (Auto-Balanced) */}
            <div
              onClick={() => setSelectedStaffId('any')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white hover:shadow-md ${
                selectedStaffId === 'any'
                  ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">Any Available Specialist</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wider">
                        Fastest Availability
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      SmartSlot will intelligently allocate the next qualified technician to minimize your wait time.
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedStaffId === 'any' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                }`}>
                  {selectedStaffId === 'any' && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>

            {/* Option B: Certified Specialists for this Service */}
            {qualifiedStaff.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                No individual technician is certified for all {selectedServices.length} selected services together. "Any Available Specialist" will auto-assign when slots are generated.
              </div>
            ) : (
              qualifiedStaff.map(staff => {
                const isSelected = selectedStaffId === staff.id;
                const workingSummary = getStaffWorkingSummary(staff.schedules);
                return (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white hover:shadow-md ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/10'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start sm:items-center gap-3">
                        <img
                          src={staff.avatar}
                          alt={staff.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{staff.name}</h3>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              {staff.role}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Certified Specialist</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{staff.bio}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Live Shift: <strong className="text-slate-800">{workingSummary}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 ${
                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Step 2 Actions */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
            >
              <span>Select Date & Time</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DATE & TIME SLOT PICKER */}
      {step === 3 && selectedServices.length > 0 && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Select Date & Time Slot</h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time availability for <span className="font-semibold text-blue-600">{combinedServiceNames}</span> ({totalDuration} mins total)
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Technician: <strong>{selectedStaffId === 'any' ? 'Any Available Specialist' : (staffList.find(s => s.id === selectedStaffId)?.name || 'Specialist')}</strong>
              </span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-blue-600 hover:text-blue-800 font-semibold ml-1 underline cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          {/* Date Selector Strip */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Available Dates</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
              {dateOptions.map(d => {
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    onClick={() => setSelectedDate(d.iso)}
                    className={`flex-shrink-0 w-18 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : d.isSunday
                        ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold uppercase">{d.dayName}</span>
                    <span className="block text-lg font-black my-0.5">{d.dayNum}</span>
                    <span className="block text-[10px] uppercase">{d.month}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots View */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button
                onClick={fetchSlots}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Clear Slot Status Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-600 mb-4 pb-2.5 border-b border-slate-100 flex-wrap">
              <span className="font-semibold text-slate-700">Indicators:</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Held in Checkout
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Booked / Full
              </span>
            </div>

            {/* Inline Slot Hold Failure Alert */}
            {slotHoldError && (
              <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-900">Slot Reservation Notice</p>
                  <p className="text-amber-800 mt-0.5">{slotHoldError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSlotHoldError(null)}
                  className="ml-auto text-amber-500 hover:text-amber-800 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="inline-block animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                <p className="text-xs font-medium">Checking live technician schedules & slot allocations...</p>
              </div>
            ) : availabilityData && availabilityData.availableSlots.length > 0 ? (
              <div className="space-y-6">
                {/* Morning Slots */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Morning Slots</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {availabilityData.availableSlots
                      .filter(slot => parseInt(slot.startTime.split(':')[0]) < 12)
                      .map(slot => {
                        const isSelected = selectedSlot?.startTime === slot.startTime;
                        const isAvailable = slot.isAvailable !== false;
                        const isBooked = slot.isBooked === true;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => isAvailable && handleSelectSlot(slot)}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              !isAvailable
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                : isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                                : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-blue-400 text-slate-800'
                            }`}
                          >
                            <span className={`block font-bold text-sm ${!isAvailable ? 'line-through decoration-slate-400 text-slate-400' : ''}`}>
                              {slot.startTime}
                            </span>
                            <span className={`block text-[10px] mt-0.5 ${!isAvailable ? 'text-slate-400' : isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              Until {slot.endTime}
                            </span>
                            {!isAvailable ? (
                              <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full mt-1.5 bg-rose-100 text-rose-700">
                                {isBooked ? 'Booked' : (slot.disabledReason || 'Unavailable')}
                              </span>
                            ) : (
                              <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1.5 ${
                                isSelected ? 'bg-blue-700 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {slot.spotsAvailable} {slot.spotsAvailable === 1 ? 'tech' : 'techs'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Afternoon Slots */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Afternoon Slots</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {availabilityData.availableSlots
                      .filter(slot => parseInt(slot.startTime.split(':')[0]) >= 12)
                      .map(slot => {
                        const isSelected = selectedSlot?.startTime === slot.startTime;
                        const isAvailable = slot.isAvailable !== false;
                        const isBooked = slot.isBooked === true;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => isAvailable && handleSelectSlot(slot)}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              !isAvailable
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                : isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                                : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-blue-400 text-slate-800'
                            }`}
                          >
                            <span className={`block font-bold text-sm ${!isAvailable ? 'line-through decoration-slate-400 text-slate-400' : ''}`}>
                              {slot.startTime}
                            </span>
                            <span className={`block text-[10px] mt-0.5 ${!isAvailable ? 'text-slate-400' : isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                              Until {slot.endTime}
                            </span>
                            {!isAvailable ? (
                              <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full mt-1.5 bg-rose-100 text-rose-700">
                                {isBooked ? 'Booked' : (slot.disabledReason || 'Unavailable')}
                              </span>
                            ) : (
                              <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1.5 ${
                                isSelected ? 'bg-blue-700 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {slot.spotsAvailable} {slot.spotsAvailable === 1 ? 'tech' : 'techs'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Checkout Hold Notice with Live 5-Minute Countdown */}
                {selectedSlot && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
                      <div>
                        <span className="font-semibold">
                          Slot <strong>{selectedSlot.startTime}</strong> held temporarily for your checkout.
                        </span>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Complete step 4 before timer expires to guarantee your booking.
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-900 font-bold text-xs tracking-wide border border-amber-300">
                        ⏱ {timeLeft !== null ? formatTimeLeft(timeLeft) : '5:00'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No appointments available on this date</p>
                <p className="text-xs text-slate-500 mt-1">
                  {availabilityData?.reason || 'All technician slots are booked or the centre is closed. Please try the next available date.'}
                </p>
              </div>
            )}
          </div>

          {/* Step 3 Actions */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              disabled={!selectedSlot}
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Customer Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CUSTOMER DETAILS & REVIEW */}
      {step === 4 && selectedServices.length > 0 && selectedSlot && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Your Details & Confirmation</h1>
            <p className="text-slate-500 text-sm mt-1">
              We need your contact information to send booking confirmation and appointment reminders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Slot Hold Timer Alert Card */}
            <div className="md:col-span-3 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 animate-pulse flex-shrink-0" />
                <span>
                  Slot <strong>{selectedSlot.startTime} – {selectedSlot.endTime}</strong> on <strong>{selectedDate}</strong> is reserved for {selectedServices.length === 1 ? selectedServices[0].name : `${selectedServices.length} selected services`}.
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                <span>Hold expires in:</span>
                <span className="text-blue-600 font-mono text-sm">{timeLeft !== null ? formatTimeLeft(timeLeft) : '5:00'}</span>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Michael Jordan"
                      value={customerDetails.name}
                      onChange={e => {
                        setCustomerDetails({ ...customerDetails, name: e.target.value });
                        if (fieldErrors.name) validateField('name', e.target.value);
                      }}
                      onBlur={e => validateField('name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                        fieldErrors.name
                          ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                          : 'border-slate-300 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-rose-600 text-xs mt-1.5 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{fieldErrors.name}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="michael@example.com"
                        value={customerDetails.email}
                        onChange={e => {
                          setCustomerDetails({ ...customerDetails, email: e.target.value });
                          if (fieldErrors.email) validateField('email', e.target.value);
                        }}
                        onBlur={e => validateField('email', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                          fieldErrors.email
                            ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-rose-600 text-xs mt-1.5 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{fieldErrors.email}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (for SMS Reminder) *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="+1 (555) 000-0000"
                        value={customerDetails.phone}
                        onChange={e => {
                          setCustomerDetails({ ...customerDetails, phone: e.target.value });
                          if (fieldErrors.phone) validateField('phone', e.target.value);
                        }}
                        onBlur={e => validateField('phone', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                          fieldErrors.phone
                            ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="text-rose-600 text-xs mt-1.5 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{fieldErrors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Make, Model & Year</label>
                  <div className="relative">
                    <Car className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. 2022 Toyota RAV4 AWD"
                      value={customerDetails.vehicle}
                      onChange={e => setCustomerDetails({ ...customerDetails, vehicle: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Special Notes / Symptoms</label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <textarea
                      rows={2}
                      placeholder="Any specific noise, vibration, warning lights, or instructions..."
                      value={customerDetails.notes}
                      onChange={e => setCustomerDetails({ ...customerDetails, notes: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Slot</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Securing Slot...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Appointment</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Summary Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
                    Booking Summary
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'}
                  </span>
                </div>

                {/* List of all selected services */}
                <div className="mt-3.5 space-y-2 pb-3 border-b border-slate-800">
                  {selectedServices.map(s => (
                    <div key={s.id} className="flex items-start justify-between text-xs py-0.5">
                      <div>
                        <span className="text-white font-semibold block">{s.name}</span>
                        <span className="text-[11px] text-slate-400">{s.duration_minutes} mins • {s.category}</span>
                      </div>
                      <span className="text-slate-200 font-bold ml-2">{formatINR(s.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="my-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      Date
                    </span>
                    <span className="font-semibold text-white">{selectedDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Time Slot
                    </span>
                    <span className="font-semibold text-white">{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      Specialist
                    </span>
                    <span className="font-semibold text-white">
                      {selectedStaffId === 'any' ? 'Smart Auto-Allocated' : staffList.find(s => s.id === selectedStaffId)?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      Total Duration
                    </span>
                    <span className="font-semibold text-white">{totalDuration} Minutes</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total Estimated</span>
                  <span className="text-2xl font-black text-emerald-400">{formatINR(totalPrice)}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Zero pre-payment required. Pay upon service completion. Free rescheduling anytime.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: BOOKING SUCCESS CELEBRATION */}
      {step === 5 && confirmedBooking && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 text-center shadow-lg max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Appointment Confirmed!</h2>
          <p className="text-slate-500 text-sm mt-1">
            Your service slot has been securely booked and allocated in our system.
          </p>

          {/* Booking Reference Pill with Copy Action */}
          <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Your Booking Reference
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-blue-600 tracking-wider">
                {confirmedBooking.bookingReference}
              </span>
              <button
                type="button"
                onClick={() => handleCopyReference(confirmedBooking.bookingReference)}
                title="Copy reference code"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {copiedRef ? <span className="text-emerald-600 font-semibold">Reference code copied to clipboard!</span> : 'Keep this code to view live status or reschedule anytime.'}
            </p>
          </div>

          {/* Appointment Details Box */}
          <div className="text-left bg-slate-50/60 rounded-2xl p-5 border border-slate-200 text-xs sm:text-sm space-y-2 mb-6">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Service:</span>
              <span className="font-bold text-slate-900">{confirmedBooking.serviceName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Assigned Specialist:</span>
              <span className="font-bold text-slate-900">{confirmedBooking.staffName || 'Specialist'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Date & Time:</span>
              <span className="font-bold text-slate-900">{confirmedBooking.date} at {confirmedBooking.startTime} - {confirmedBooking.endTime}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Customer:</span>
              <span className="font-bold text-slate-900">{confirmedBooking.customerName} ({confirmedBooking.customerPhone})</span>
            </div>
            {confirmedBooking.vehicleDetails && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Vehicle:</span>
                <span className="font-bold text-slate-900">{confirmedBooking.vehicleDetails}</span>
              </div>
            )}
          </div>

          {/* Confirmation & Notification Notice */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs flex items-center gap-2.5 text-left mb-4 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">Booking Confirmation & Service Reminders Dispatched</p>
              <p className="text-emerald-700 mt-0.5">
                A booking receipt and automated 24h & 2h reminders have been logged and dispatched to your contact details.
              </p>
            </div>
          </div>

          {/* Cancellation & Rescheduling Policy Notice */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left text-xs text-slate-600 mb-6 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Complimentary Cancellation & Rescheduling</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You may modify or cancel this booking free of charge up to 2 hours prior to your scheduled appointment. Upon cancellation, your reserved service bay is immediately released back to the workshop pool.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 flex-wrap">
            <button
              onClick={() => onManageBookingClick && onManageBookingClick(confirmedBooking.bookingReference)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Manage / Reschedule</span>
            </button>

            <button
              onClick={() => handleDownloadCalendar(confirmedBooking)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Add to Calendar (.ics)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Summary</span>
            </button>

            <button
              onClick={() => {
                setStep(1);
                setSelectedServices([]);
                setSelectedSlot(null);
                setConfirmedBooking(null);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-all"
            >
              Book Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
