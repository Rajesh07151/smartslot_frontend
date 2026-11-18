import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../common/StatusBadge';
import { formatINR, formatFriendlyDate, formatDuration } from '../../utils/formatters';
import {
  Search, Calendar, Clock, User, Car, Phone, Mail, FileText,
  AlertTriangle, CheckCircle2, XCircle, ArrowRight, RefreshCw, Shield,
  Check, Copy, Sparkles, LogIn, Wrench, ChevronRight, PlayCircle
} from 'lucide-react';

export default function ManageBooking({ prefillReference = null }) {
  const { user, isAuthenticated, openCustomerAuth } = useAuth();

  // Bookings list for logged-in user
  const [myBookings, setMyBookings] = useState([]);
  const [loadingMyBookings, setLoadingMyBookings] = useState(false);

  // Manual search state
  const [searchQuery, setSearchQuery] = useState(prefillReference || '');
  const [searchedAppointment, setSearchedAppointment] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(!isAuthenticated);

  // Notifications
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [copiedRef, setCopiedRef] = useState(null);

  // Active appointment for modal actions (Reschedule / Cancel)
  const [activeAptModal, setActiveAptModal] = useState(null);

  // Reschedule Modal state
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedNewSlot, setSelectedNewSlot] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Cancel Modal state
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Schedule conflict');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Fetch logged in customer's bookings
  useEffect(() => {
    if (isAuthenticated && user) {
      loadMyBookings();
    } else {
      setMyBookings([]);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (prefillReference) {
      setSearchQuery(prefillReference);
      setShowManualSearch(true);
      handleSearch(null, prefillReference);
    }
  }, [prefillReference]);

  const loadMyBookings = async () => {
    try {
      setLoadingMyBookings(true);
      setError(null);
      const data = await api.getMyBookings({
        userId: user?.id,
        email: user?.email,
        phone: user?.phone
      });
      setMyBookings(data || []);
    } catch (err) {
      console.error('Error loading my bookings:', err);
    } finally {
      setLoadingMyBookings(false);
    }
  };

  const handleSearch = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const query = customQuery || searchQuery;
    if (!query.trim()) return;

    try {
      setSearchLoading(true);
      setError(null);
      setSuccessMessage(null);
      const data = await api.lookupAppointment(query.trim());
      setSearchedAppointment(data);
    } catch (err) {
      setError(err.message || 'No appointment found matching that reference or phone.');
      setSearchedAppointment(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedRef(code);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  // Reschedule handlers
  const openRescheduleModal = async (apt) => {
    setActiveAptModal(apt);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const initialDate = tomorrow.toISOString().slice(0, 10);
    setRescheduleDate(initialDate);
    setIsRescheduleOpen(true);
    fetchRescheduleSlots(apt, initialDate);
  };

  const fetchRescheduleSlots = async (apt, targetDate) => {
    try {
      setRescheduleLoading(true);
      const data = await api.getAvailability(
        apt.service_id,
        targetDate,
        apt.staff_id,
        apt.id
      );
      setRescheduleSlots(data.availableSlots || []);
      setSelectedNewSlot(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedNewSlot || !activeAptModal) return;

    try {
      setRescheduleLoading(true);
      setError(null);
      await api.rescheduleAppointment(activeAptModal.id, {
        date: rescheduleDate,
        startTime: selectedNewSlot.startTime,
        staffId: activeAptModal.staff_id,
        reason: rescheduleReason
      });

      setIsRescheduleOpen(false);
      setSuccessMessage(`Appointment ${activeAptModal.booking_reference} has been rescheduled to ${formatFriendlyDate(rescheduleDate)} at ${selectedNewSlot.startTime}.`);

      if (searchedAppointment && searchedAppointment.id === activeAptModal.id) {
        setSearchedAppointment({
          ...searchedAppointment,
          date: rescheduleDate,
          start_time: selectedNewSlot.startTime,
          end_time: selectedNewSlot.endTime,
          status: 'CONFIRMED'
        });
      }

      if (isAuthenticated) {
        loadMyBookings();
      }
    } catch (err) {
      setError(err.message || 'Failed to reschedule. Please try another slot.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Cancel handlers
  const openCancelModal = (apt) => {
    setActiveAptModal(apt);
    setIsCancelOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!activeAptModal) return;
    try {
      setCancelLoading(true);
      setError(null);
      await api.cancelAppointment(activeAptModal.id, cancelReason);

      setIsCancelOpen(false);
      setSuccessMessage(`Appointment ${activeAptModal.booking_reference} has been cancelled.`);

      if (searchedAppointment && searchedAppointment.id === activeAptModal.id) {
        setSearchedAppointment({
          ...searchedAppointment,
          status: 'CANCELLED',
          cancellation_reason: cancelReason,
          canModify: false
        });
      }

      if (isAuthenticated) {
        loadMyBookings();
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Helper to render live order status tracker
  const renderOrderStatusTracker = (status) => {
    if (status === 'CANCELLED') {
      return (
        <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2.5 text-xs text-rose-800">
          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>This service appointment has been cancelled.</span>
        </div>
      );
    }

    if (status === 'NO_SHOW') {
      return (
        <div className="p-3 bg-purple-50 border border-purple-200/80 rounded-xl flex items-center gap-2.5 text-xs text-purple-800">
          <AlertTriangle className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span>Marked as No-Show. Please contact service desk or reschedule.</span>
        </div>
      );
    }

    const steps = [
      { key: 'CONFIRMED', label: '1. Confirmed', desc: 'Bay Slot Reserved' },
      { key: 'IN_PROGRESS', label: '2. In Progress', desc: 'Vehicle in Service Bay' },
      { key: 'COMPLETED', label: '3. Completed', desc: 'Inspected & Ready' }
    ];

    let currentStepIndex = 0;
    if (status === 'IN_PROGRESS') currentStepIndex = 1;
    if (status === 'COMPLETED') currentStepIndex = 2;

    return (
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
          <span>Live Order & Service Status</span>
          <span className="text-slate-700 font-bold">
            {status === 'CONFIRMED' && 'Ready for check-in'}
            {status === 'IN_PROGRESS' && 'Under technician service'}
            {status === 'COMPLETED' && 'Ready for customer pickup'}
          </span>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0"></div>
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 transition-all duration-300 z-0"
            style={{ width: currentStepIndex === 0 ? '0%' : currentStepIndex === 1 ? '50%' : '100%' }}
          ></div>

          {steps.map((st, idx) => {
            const isDone = currentStepIndex >= idx;
            const isCurrent = currentStepIndex === idx;
            return (
              <div key={st.key} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className={`text-[11px] mt-1 font-medium ${isCurrent ? 'text-slate-900 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                  {st.label}
                </span>
                <span className="text-[9px] text-slate-400 hidden sm:block">{st.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render individual booking card
  const renderBookingCard = (apt, isSingle = false) => {
    return (
      <div key={apt.id} className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
        {/* Top Header Strip */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Booking Code</span>
              <button
                type="button"
                onClick={() => handleCopyCode(apt.booking_reference)}
                className="flex items-center gap-1 font-mono font-bold text-base sm:text-lg text-slate-900 hover:text-blue-600 transition-colors"
                title="Copy reference code"
              >
                <span>{apt.booking_reference}</span>
                {copiedRef === apt.booking_reference ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                )}
              </button>
              <StatusBadge status={apt.status} size="sm" />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Booked on {formatFriendlyDate(apt.date)} at {apt.start_time} - {apt.end_time}
            </p>
          </div>

          {/* Quick Reschedule / Cancel for active slots */}
          {apt.canModify && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openRescheduleModal(apt)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-all shadow-xs"
              >
                Reschedule Slot
              </button>
              <button
                type="button"
                onClick={() => openCancelModal(apt)}
                className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Live Order Status Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100">
          {renderOrderStatusTracker(apt.status)}
        </div>

        {/* Booking Details Grid */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Service & Price */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Selected Service
              </span>
              <h3 className="font-semibold text-slate-900 text-sm">{apt.service_name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {apt.service_category} • {formatDuration(apt.duration_minutes)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-xs text-slate-500">Service Estimate:</span>
                <span className="font-bold text-slate-900 text-sm sm:text-base">{formatINR(apt.total_price)}</span>
              </div>
            </div>

            {/* Specialist Technician */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
              <img
                src={apt.staff_avatar}
                alt={apt.staff_name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
              />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Allocated Specialist
                </span>
                <h4 className="font-semibold text-slate-900 text-sm">{apt.staff_name}</h4>
                <p className="text-xs text-slate-500 font-medium">{apt.staff_role}</p>
                {apt.staff_phone && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{apt.staff_phone}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle & Slot Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-slate-600">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/60 border border-slate-100">
              <Car className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Vehicle: <strong className="text-slate-800">{apt.vehicle_details || 'Standard'}</strong></span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/60 border border-slate-100">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Date: <strong className="text-slate-800">{formatFriendlyDate(apt.date)}</strong></span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/60 border border-slate-100">
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Slot: <strong className="text-slate-800">{apt.start_time} - {apt.end_time}</strong></span>
            </div>
          </div>

          {/* Customer or Staff Notes */}
          {apt.customer_notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="font-semibold text-slate-700 block mb-0.5">Customer Instructions:</span>
              <p className="text-slate-600">{apt.customer_notes}</p>
            </div>
          )}

          {apt.staff_notes && (
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
              <span className="font-semibold block mb-0.5">Technician Bay Notes:</span>
              <p className="text-blue-800">{apt.staff_notes}</p>
            </div>
          )}

          {apt.cancellation_reason && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
              <span className="font-semibold block mb-0.5">Cancellation Reason:</span>
              <p>{apt.cancellation_reason}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Title Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {isAuthenticated ? 'My Bookings & Order Status' : 'Track Your Service Order'}
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
          {isAuthenticated
            ? `Welcome back, ${user.name}. Track live service progress, bay allocation, and order status.`
            : 'Check live status of your vehicle service with your booking reference or sign in to view all orders.'}
        </p>
      </div>

      {/* Global Success / Alert messages */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center gap-3 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <p className="font-medium">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-600 hover:text-emerald-800 font-bold">&times;</button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 flex items-center gap-3 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <p className="font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700 font-bold">&times;</button>
        </div>
      )}

      {/* If NOT logged in: Prompt to Sign In / Register */}
      {!isAuthenticated && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm sm:text-base">Have an Account or Need to Register?</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-lg">
              Sign in to view all your vehicle bookings and live order status in one centralized dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => openCustomerAuth('login')}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-semibold hover:bg-slate-100 transition-all shadow-xs flex-1 sm:flex-initial text-center"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openCustomerAuth('register')}
              className="px-4 py-2 rounded-xl bg-slate-700 text-white text-xs font-semibold hover:bg-slate-600 transition-all flex-1 sm:flex-initial text-center"
            >
              Register
            </button>
          </div>
        </div>
      )}

      {/* LOGGED IN USER: MY BOOKINGS LIST */}
      {isAuthenticated && (
        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Your Vehicle Appointments</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                {myBookings.length} {myBookings.length === 1 ? 'Booking' : 'Bookings'}
              </span>
            </div>

            <button
              type="button"
              onClick={loadMyBookings}
              disabled={loadingMyBookings}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
              title="Refresh your bookings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMyBookings ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {loadingMyBookings ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Loading your vehicle service bookings...</p>
            </div>
          ) : myBookings.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">No Active Bookings Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You do not have any appointments recorded under {user.email}. Book a service slot to get started!
              </p>
              <a
                href="#book"
                onClick={() => window.location.hash = 'book'}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
              >
                <span>Book a Service Appointment</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map(apt => renderBookingCard(apt))}
            </div>
          )}
        </div>
      )}

      {/* MANUAL LOOKUP SECTION (for guests or searching family vehicles) */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              {isAuthenticated ? 'Look Up Another Booking by Reference' : 'Enter Booking Reference Code'}
            </h3>
            <p className="text-xs text-slate-500">
              Check service status using your code (e.g. <span className="font-mono font-bold text-slate-700">SLOT-HQ2S</span>) or registered phone number.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
          <form onSubmit={e => handleSearch(e)} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-grow">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Booking Reference (e.g. SLOT-HQ2S) or Phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm uppercase tracking-wider focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="px-6 py-2 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Track Order</span>
            </button>
          </form>

          {/* Quick Demo Pre-fill Pill for Harsha */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-400 text-[11px]">Quick Search:</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('SLOT-HQ2S');
                handleSearch(null, 'SLOT-HQ2S');
              }}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition-colors"
            >
              SLOT-HQ2S (Harsha)
            </button>
          </div>
        </div>

        {/* Display manual search result if not already displayed */}
        {searchedAppointment && (
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search Result:</h4>
            {renderBookingCard(searchedAppointment, true)}
          </div>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {isRescheduleOpen && activeAptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Reschedule Service Slot</h2>
            <p className="text-xs text-slate-500 mb-4">
              Select a new date and time slot for <strong>{activeAptModal.booking_reference}</strong> with {activeAptModal.staff_name}.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => {
                    setRescheduleDate(e.target.value);
                    fetchRescheduleSlots(activeAptModal, e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Available Slots on {formatFriendlyDate(rescheduleDate)}
                </label>
                {rescheduleLoading ? (
                  <div className="py-6 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-600" />
                    <span className="text-xs">Checking live bay availability...</span>
                  </div>
                ) : rescheduleSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {rescheduleSlots.map(slot => {
                      const isSelected = selectedNewSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => setSelectedNewSlot(slot)}
                          className={`p-2 rounded-lg border text-center text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">No available slots on this date. Please select another day.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Reschedule (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Work commitment rescheduled"
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedNewSlot || rescheduleLoading}
                onClick={handleConfirmReschedule}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-xs hover:bg-slate-800 disabled:opacity-50"
              >
                {rescheduleLoading ? 'Updating...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCancelOpen && activeAptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Cancel Booking {activeAptModal.booking_reference}?</h2>
            <p className="text-xs text-slate-500 mb-4">
              Your service slot for <strong>{activeAptModal.service_name}</strong> on {formatFriendlyDate(activeAptModal.date)} at {activeAptModal.start_time} will be released.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-slate-800 bg-white"
              >
                <option value="Schedule conflict">Schedule conflict</option>
                <option value="Vehicle issue resolved elsewhere">Vehicle issue resolved elsewhere</option>
                <option value="Travel / Emergency">Travel / Emergency</option>
                <option value="Postponing service to later date">Postponing service to later date</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-medium hover:bg-slate-100"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-medium shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
