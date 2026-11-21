import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../common/StatusBadge';
import { formatINR, formatFriendlyDate } from '../../utils/formatters';
import {
  Calendar, Clock, User, CheckCircle2, AlertTriangle, RefreshCw,
  LogOut, PlayCircle, CheckCircle, FileText, Wrench, Shield, Car, Phone, XCircle
} from 'lucide-react';

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeNoteAptId, setActiveNoteAptId] = useState(null);
  const [staffNoteText, setStaffNoteText] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadStaffAppointments();
  }, []);

  const loadStaffAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      // The backend /api/appointments automatically filters by req.user.staff_id for STAFF role
      const data = await api.getAppointments();
      setAppointments(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load assigned appointments.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setUpdatingId(id);
      await api.updateAppointmentStatus(id, newStatus, staffNoteText || null);
      setActiveNoteAptId(null);
      setStaffNoteText('');
      loadStaffAppointments();
    } catch (err) {
      alert(`Error updating appointment: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const upcomingAppointments = appointments.filter(a => a.date > todayStr);

  const filteredAppointments = appointments.filter(a => {
    if (statusFilter === 'TODAY') return a.date === todayStr;
    if (statusFilter === 'UPCOMING') return a.date > todayStr;
    if (statusFilter === 'ACTIVE') return ['CONFIRMED', 'IN_PROGRESS'].includes(a.status);
    if (statusFilter === 'COMPLETED') return a.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Staff Header Card */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30 font-bold text-lg">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{user?.name}</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Specialist Staff
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Assigned Technician Operations • Bay Appointments Only
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadStaffAppointments}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Roster</span>
            </button>
            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Quick Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Assigned</span>
            <span className="text-2xl font-black text-slate-900">{appointments.length}</span>
            <p className="text-[11px] text-slate-500 mt-1">All scheduled jobs</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">Today's Jobs</span>
            <span className="text-2xl font-black text-blue-600">{todayAppointments.length}</span>
            <p className="text-[11px] text-slate-500 mt-1">{formatFriendlyDate(todayStr)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">In Progress</span>
            <span className="text-2xl font-black text-amber-600">
              {appointments.filter(a => a.status === 'IN_PROGRESS').length}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Currently on hoist/bay</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">Completed</span>
            <span className="text-2xl font-black text-emerald-600">
              {appointments.filter(a => a.status === 'COMPLETED').length}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Finished services</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: `All (${appointments.length})` },
            { id: 'TODAY', label: `Today (${todayAppointments.length})` },
            { id: 'ACTIVE', label: 'Active / On-Going' },
            { id: 'COMPLETED', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
            <p className="text-xs font-medium">Loading your assigned specialist appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No appointments in this view</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter === 'TODAY'
                ? "You have no appointments scheduled for today."
                : "No matching assigned appointments."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map(apt => {
              const isToday = apt.date === todayStr;
              return (
                <div
                  key={apt.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                    isToday ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {apt.start_time}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {apt.booking_reference}
                          </span>
                          <StatusBadge status={apt.status} />
                          {isToday && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Today's Job
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-1">
                          {apt.service_name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {formatFriendlyDate(apt.date)} • {apt.start_time} - {apt.end_time} ({apt.duration_minutes} mins)
                        </p>
                      </div>
                    </div>

                    {/* Quick Status Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {apt.status === 'CONFIRMED' && (
                        <>
                          <button
                            disabled={updatingId === apt.id}
                            onClick={() => handleUpdateStatus(apt.id, 'IN_PROGRESS')}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Start Job</span>
                          </button>
                          <button
                            disabled={updatingId === apt.id}
                            onClick={() => handleUpdateStatus(apt.id, 'NO_SHOW')}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Mark No-Show</span>
                          </button>
                        </>
                      )}

                      {apt.status === 'IN_PROGRESS' && (
                        <button
                          disabled={updatingId === apt.id}
                          onClick={() => handleUpdateStatus(apt.id, 'COMPLETED')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      )}

                      {['CONFIRMED', 'IN_PROGRESS'].includes(apt.status) && (
                        <button
                          onClick={() => {
                            setActiveNoteAptId(activeNoteAptId === apt.id ? null : apt.id);
                            setStaffNoteText(apt.staff_notes || '');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Notes</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Customer and Vehicle Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs text-slate-600">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                      <span className="font-semibold text-slate-800">{apt.customer_name}</span>
                      <p className="text-slate-500">{apt.customer_phone}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle</span>
                      <span className="font-semibold text-slate-800">{apt.vehicle_details || 'Standard Inspection'}</span>
                      {apt.customer_notes && (
                        <p className="text-slate-500 italic mt-0.5">"{apt.customer_notes}"</p>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Staff / Bay Notes</span>
                      <span className="text-slate-700">{apt.staff_notes || 'No notes logged yet.'}</span>
                    </div>
                  </div>

                  {/* Inline Staff Note Editing Area */}
                  {activeNoteAptId === apt.id && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add inspection or completion note..."
                        value={staffNoteText}
                        onChange={e => setStaffNoteText(e.target.value)}
                        className="flex-grow px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-slate-800"
                      />
                      <button
                        onClick={() => handleUpdateStatus(apt.id, apt.status)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                      >
                        Save Note
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
