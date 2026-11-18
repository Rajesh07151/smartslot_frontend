import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import StatusBadge from '../common/StatusBadge';
import { formatINR, formatFriendlyDate } from '../../utils/formatters';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User,
  Plus, RefreshCw, CheckCircle2, PlayCircle, AlertTriangle, XCircle, FileText
} from 'lucide-react';

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [staffList, setStaffList] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  const [staffNote, setStaffNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDayData();
  }, [selectedDate]);

  const loadDayData = async () => {
    try {
      setLoading(true);
      const [staffData, aptsData] = await Promise.all([
        api.getStaff(),
        api.getAppointments({ date: selectedDate })
      ]);
      setStaffList(staffData);
      setAppointments(aptsData);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeDay = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleUpdateStatus = async (aptId, newStatus) => {
    try {
      setActionLoading(true);
      await api.updateAppointmentStatus(aptId, newStatus, staffNote || null);
      if (selectedApt && selectedApt.id === aptId) {
        setSelectedApt({ ...selectedApt, status: newStatus, staff_notes: staffNote || selectedApt.staff_notes });
      }
      loadDayData();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Operating hours from 08:00 to 18:00
  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dayOfWeekIndex = dateObj.getDay();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => changeDay(-1)}
              className="p-1.5 rounded-md hover:bg-white text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-xs sm:text-sm px-3 text-slate-800">
              {formatFriendlyDate(selectedDate)}
            </span>
            <button
              onClick={() => changeDay(1)}
              className="p-1.5 rounded-md hover:bg-white text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Today
          </button>

          <button
            onClick={loadDayData}
            disabled={loading}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Refresh Day Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5-Staff Columns Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Staff Headers */}
          <div
            className="grid border-b border-slate-200 bg-slate-50"
            style={{ gridTemplateColumns: `90px repeat(${staffList.length || 1}, minmax(160px, 1fr))` }}
          >
            <div className="p-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-r border-slate-200 flex items-center justify-center">
              Bay Time
            </div>
            {staffList.map(staff => {
              const schedule = staff.schedules.find(s => s.day_of_week === dayOfWeekIndex);
              const isWorking = schedule && schedule.is_working;
              return (
                <div key={staff.id} className="p-3 border-r border-slate-200 last:border-r-0 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <img
                      src={staff.avatar}
                      alt={staff.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-300"
                    />
                    <div className="text-left">
                      <h4 className="font-semibold text-xs text-slate-900 leading-tight">{staff.name}</h4>
                      <p className="text-[10px] text-slate-500 leading-tight">{staff.role.split(' ')[0]} Specialist</p>
                    </div>
                  </div>
                  <div className="mt-1">
                    {isWorking ? (
                      <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {schedule.start_time} - {schedule.end_time}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        Day Off
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Rows and Appointments */}
          <div className="relative">
            {hours.map(hour => (
              <div
                key={hour}
                className="grid border-b border-slate-100 min-h-[68px]"
                style={{ gridTemplateColumns: `90px repeat(${staffList.length || 1}, minmax(160px, 1fr))` }}
              >
                {/* Time Label */}
                <div className="p-2 text-xs font-medium text-slate-400 border-r border-slate-200 bg-slate-50/50 flex items-start justify-center">
                  {hour}
                </div>

                {/* 5 Staff Slots */}
                {staffList.map(staff => {
                  const schedule = staff.schedules.find(s => s.day_of_week === dayOfWeekIndex);
                  const isWorking = schedule && schedule.is_working;

                  const isLunch = schedule && schedule.break_start && schedule.break_end &&
                    (hour >= schedule.break_start && hour < schedule.break_end);

                  const slotApts = appointments.filter(a => {
                    return a.staff_id === staff.id &&
                      a.start_time.startsWith(hour.slice(0, 2));
                  });

                  return (
                    <div
                      key={staff.id}
                      className={`p-1.5 border-r border-slate-100 last:border-r-0 relative transition-colors ${
                        !isWorking
                          ? 'bg-slate-100/50'
                          : isLunch
                          ? 'bg-amber-50/30'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {isLunch && slotApts.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[10px] font-medium text-amber-800 opacity-60">
                          Lunch Break
                        </div>
                      )}

                      {/* Render Appointments in slot */}
                      {slotApts.map(apt => {
                        const statusColors = {
                          CONFIRMED: 'bg-blue-50/90 border-blue-200 text-blue-900 hover:bg-blue-100/80',
                          IN_PROGRESS: 'bg-amber-50/90 border-amber-300 text-amber-900 ring-1 ring-amber-300',
                          COMPLETED: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
                          CANCELLED: 'bg-rose-50/90 border-rose-200 text-rose-800 line-through opacity-60',
                          NO_SHOW: 'bg-purple-50/90 border-purple-200 text-purple-900'
                        };
                        const colorClass = statusColors[apt.status] || 'bg-slate-100 border-slate-200 text-slate-800';

                        return (
                          <div
                            key={apt.id}
                            onClick={() => {
                              setSelectedApt(apt);
                              setStaffNote(apt.staff_notes || '');
                            }}
                            className={`p-2 rounded-lg border text-left cursor-pointer transition-all shadow-xs mb-1 ${colorClass}`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span>{apt.start_time} - {apt.end_time}</span>
                              <span className="font-mono text-[9px] bg-white/80 px-1 py-0.5 rounded border border-slate-200/50">{apt.booking_reference}</span>
                            </div>
                            <h5 className="font-semibold text-xs mt-0.5 truncate">{apt.customer_name}</h5>
                            <p className="text-[10px] truncate opacity-80">{apt.service_name}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment Details / Action Modal */}
      {selectedApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Appointment Details</span>
                <div className="flex items-center gap-3 mt-1">
                  <h3 className="text-lg font-bold text-slate-900">{selectedApt.customer_name}</h3>
                  <StatusBadge status={selectedApt.status} />
                </div>
                <span className="font-mono text-xs text-slate-600 font-semibold">{selectedApt.booking_reference}</span>
              </div>
              <button
                onClick={() => setSelectedApt(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[11px]">Service:</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedApt.service_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[11px]">Specialist:</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedApt.staff_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[11px]">Slot:</span>
                  <span className="font-semibold text-slate-800">{selectedApt.date} at {selectedApt.start_time} - {selectedApt.end_time}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[11px]">Service Price (INR):</span>
                  <span className="font-bold text-slate-900">{formatINR(selectedApt.total_price)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1">
                <div><span className="text-slate-500">Contact:</span> <strong className="text-slate-900 font-medium">{selectedApt.customer_phone}</strong> • {selectedApt.customer_email}</div>
                {selectedApt.vehicle_details && (
                  <div><span className="text-slate-500">Vehicle:</span> <strong className="text-slate-900 font-medium">{selectedApt.vehicle_details}</strong></div>
                )}
                {selectedApt.customer_notes && (
                  <div><span className="text-slate-500">Customer Notes:</span> <span className="text-slate-700 italic">"{selectedApt.customer_notes}"</span></div>
                )}
              </div>

              {/* Technician Notes Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Technician Work Notes & Diagnostics</label>
                <textarea
                  rows={3}
                  value={staffNote}
                  onChange={e => setStaffNote(e.target.value)}
                  placeholder="Record diagnostics results, replaced parts, clearance codes, or inspection findings..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>

              {/* Status Action Buttons */}
              <div className="pt-2 border-t border-slate-100">
                <span className="block text-xs font-semibold text-slate-700 mb-2">Update Operational Status:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedApt.id, 'IN_PROGRESS')}
                    className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-medium hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>In-Progress</span>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedApt.id, 'COMPLETED')}
                    className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedApt.id, 'NO_SHOW')}
                    className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>No-Show</span>
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedApt.id, 'CANCELLED')}
                    className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedApt(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
