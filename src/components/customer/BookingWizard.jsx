import React, { useState, useEffect, useId } from 'react';
import { api } from '../../api';
import { formatINR } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import {
  Wrench, Calendar, Clock, User, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
  Shield, Car, Sparkles, Phone, Mail, FileText, ChevronRight, Check, RefreshCw, QrCode
} from 'lucide-react';

export default function BookingWizard({ onBookingSuccess, onManageBookingClick }) {
  // Wizard steps: 1=Service, 2=Specialist, 3=Date & Slot, 4=Details, 5=Success
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedService, setSelectedService] = useState(null);

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

  // Checkout session ID for slot reservation
  const [sessionId] = useState(() => 'sess-' + Math.random().toString(36).substring(2, 9));

  // Customer form details
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle: '',
    notes: ''
  });

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Load services and staff on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [servicesData, staffData] = await Promise.all([
          api.getServices(),
          api.getStaff()
        ]);
        setServices(servicesData);
        setStaffList(staffData);
      } catch (err) {
        setError('Failed to load services and technician data. Please check if backend is running.');
      } finally {
        setLoading(false);
      }
    }
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

  // Fetch slot availability when service, staff, or date changes
  useEffect(() => {
    if (selectedService && selectedDate && step === 3) {
      fetchSlots();
    }
  }, [selectedService, selectedStaffId, selectedDate, step]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedSlot(null);
      const data = await api.getAvailability(
        selectedService.id,
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

  // Handle slot selection with temporary hold
  const handleSelectSlot = async (slot) => {
    setSelectedSlot(slot);
    try {
      const hold = await api.holdSlot({
        serviceId: selectedService.id,
        staffId: selectedStaffId,
        date: selectedDate,
        startTime: slot.startTime,
        sessionId
      });
      setHoldInfo(hold);
    } catch (err) {
      // Slot was held or conflict
      setError(err.message);
      fetchSlots();
    }
  };

  // Submit final booking
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!customerDetails.name || !customerDetails.email || !customerDetails.phone) {
      setError('Please provide your name, email, and phone number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        serviceId: selectedService.id,
        staffId: selectedStaffId,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        customerName: customerDetails.name,
        customerEmail: customerDetails.email,
        customerPhone: customerDetails.phone,
        vehicleDetails: customerDetails.vehicle,
        customerNotes: customerDetails.notes,
        sessionId
      };

      const result = await api.createAppointment(payload);
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

  // Sort staff: certified specialists for this service first, then other workshop specialists
  const sortedStaff = selectedService
    ? [...staffList].sort((a, b) => {
        const aCert = a.services?.some(s => s.id === selectedService.id) ? 1 : 0;
        const bCert = b.services?.some(s => s.id === selectedService.id) ? 1 : 0;
        return bCert - aCert;
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

      {/* Error alert banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="text-sm">
            <p className="font-semibold">Booking Notice</p>
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700 font-bold">&times;</button>
        </div>
      )}

      {/* STEP 1: SERVICE SELECTION */}
      {step === 1 && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Select Service</h1>
            <p className="text-slate-500 text-sm mt-1">Choose from our precision vehicle care and diagnostic operations.</p>
          </div>

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

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.map(service => {
              const isSelected = selectedService?.id === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative bg-white hover:shadow-md ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {service.category}
                      </span>
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
                    <span className={`font-semibold ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                      {isSelected ? 'Selected ✓' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 1 Actions */}
          <div className="mt-8 flex justify-end">
            <button
              disabled={!selectedService}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Continue to Specialist</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SPECIALIST SELECTION */}
      {step === 2 && selectedService && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Choose Your Specialist</h1>
            <p className="text-slate-500 text-sm mt-1">
              Select a certified technician for <span className="font-semibold text-blue-600">{selectedService.name}</span>, or let us auto-assign the best available slot.
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

            {/* Option B: Active Specialists from Bay Roster */}
            {sortedStaff.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                No individual technicians registered yet. "Any Available Specialist" will auto-assign when slots are generated.
              </div>
            ) : (
              sortedStaff.map(staff => {
                const isSelected = selectedStaffId === staff.id;
                const workingSummary = getStaffWorkingSummary(staff.schedules);
                const isCertified = staff.services?.some(srv => srv.id === selectedService.id);
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
                            {isCertified ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Certified Specialist</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                Workshop Specialist
                              </span>
                            )}
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              <span>Select Date & Time</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DATE & TIME SLOT PICKER */}
      {step === 3 && selectedService && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Select Date & Time Slot</h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time availability for <span className="font-semibold text-blue-600">{selectedService.name}</span> ({selectedService.duration_minutes} mins)
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
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-sm">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button
                onClick={fetchSlots}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

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

                {/* Checkout Hold Notice */}
                {selectedSlot && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Slot <strong>{selectedSlot.startTime}</strong> held temporarily for your checkout (5 minutes).</span>
                    </div>
                    <span className="font-semibold text-amber-700">Reserved</span>
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
      {step === 4 && selectedService && selectedSlot && (
        <div>
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Your Details & Confirmation</h1>
            <p className="text-slate-500 text-sm mt-1">
              We need your contact information to send booking confirmation and appointment reminders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      onChange={e => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
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
                        onChange={e => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
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
                        onChange={e => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
                  Booking Summary
                </span>
                <h3 className="font-extrabold text-lg mt-2">{selectedService.name}</h3>
                <p className="text-slate-400 text-xs mt-1">{selectedService.category}</p>

                <div className="my-5 border-t border-slate-800 pt-4 space-y-3 text-xs">
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
                      Service Duration
                    </span>
                    <span className="font-semibold text-white">{selectedService.duration_minutes} Minutes</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total Estimated</span>
                  <span className="text-2xl font-black text-white">₹{Number(selectedService.price).toLocaleString('en-IN')}</span>
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

          {/* Booking Reference Pill */}
          <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 inline-block">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Your Booking Reference</span>
            <span className="font-mono text-2xl sm:text-3xl font-black text-blue-600 tracking-wider">
              {confirmedBooking.bookingReference}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Keep this code to view status or reschedule anytime.</p>
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

          {/* Simulated Notification Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2.5 text-left mb-6">
            <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">Simulated Email & SMS Notification Dispatched</p>
              <p className="text-blue-700">A confirmation notice and automated 24h & 2h reminders have been logged in the communication pipeline.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onManageBookingClick && onManageBookingClick(confirmedBooking.bookingReference)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Manage / Reschedule Booking</span>
            </button>

            <button
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedSlot(null);
                setConfirmedBooking(null);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
