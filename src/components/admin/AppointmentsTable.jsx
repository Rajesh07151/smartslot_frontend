import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import StatusBadge from '../common/StatusBadge';
import { formatINR, formatFriendlyDate } from '../../utils/formatters';
import {
  Search, Filter, Calendar, Clock, User, Bell, CheckCircle2,
  AlertTriangle, RefreshCw, Car, ChevronDown, Check, XCircle, PlayCircle
} from 'lucide-react';

export default function AppointmentsTable() {
  const [appointments, setAppointments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    loadStaff();
    loadAppointments();
  }, [selectedStaff, selectedStatus, selectedDate]);

  const loadStaff = async () => {
    try {
      const data = await api.getStaff();
      setStaffList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.getAppointments({
        staffId: selectedStaff,
        status: selectedStatus,
        date: selectedDate || undefined,
        search: search || undefined
      });
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAppointments();
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateAppointmentStatus(id, newStatus);
      setToastMessage(`Status successfully updated to ${newStatus}`);
      setTimeout(() => setToastMessage(null), 3000);
      loadAppointments();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleSendReminder = async (id, customerName) => {
    try {
      await api.sendReminder(id, 'REMINDER_24H');
      setToastMessage(`Automated SMS reminder dispatched to ${customerName}`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      alert('Error sending reminder: ' + err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200/80 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, phone (+91...), code (SLOT-...), or vehicle..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800 bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-600">Filters:</span>
          </div>

          {/* Date */}
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
          />

          {/* Staff Filter */}
          <select
            value={selectedStaff}
            onChange={e => setSelectedStaff(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
          >
            <option value="all">All Specialists</option>
            {staffList.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="NO_SHOW">No-Show</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {(selectedDate || selectedStaff !== 'all' || selectedStatus !== 'all' || search) && (
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedStaff('all');
                setSelectedStatus('all');
                setSearch('');
              }}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium underline ml-auto"
            >
              Reset Filters
            </button>
          )}

          <button
            onClick={loadAppointments}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 ml-auto"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Booking Ref</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Service & Vehicle</th>
              <th className="py-3 px-4">Technician</th>
              <th className="py-3 px-4">Date & Slot</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-600" />
                  <span>Loading appointments data...</span>
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-10 text-center text-slate-500">
                  No appointments match the selected criteria.
                </td>
              </tr>
            ) : (
              appointments.map(apt => (
                <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Ref */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {apt.booking_reference}
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <strong className="block text-slate-900 font-medium">{apt.customer_name}</strong>
                    <span className="text-[11px] text-slate-500">{apt.customer_phone}</span>
                  </td>

                  {/* Service & Vehicle */}
                  <td className="py-3.5 px-4">
                    <strong className="block text-slate-900 font-medium">{apt.service_name}</strong>
                    <span className="text-[11px] text-slate-500 truncate max-w-[200px] block">
                      {apt.vehicle_details || 'Standard'} • <span className="font-semibold text-slate-800">{formatINR(apt.total_price)}</span>
                    </span>
                  </td>

                  {/* Technician */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={apt.staff_avatar}
                        alt={apt.staff_name}
                        className="w-6 h-6 rounded-full object-cover border border-slate-200"
                      />
                      <span className="font-medium text-slate-800">{apt.staff_name}</span>
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="block font-medium text-slate-900">{apt.date}</span>
                    <span className="text-[11px] text-slate-500">{apt.start_time} - {apt.end_time}</span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={apt.status} size="sm" />
                  </td>

                  {/* Quick Action Buttons */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {apt.status === 'CONFIRMED' && (
                        <button
                          title="Start service (In Progress)"
                          onClick={() => handleStatusChange(apt.id, 'IN_PROGRESS')}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}

                      {apt.status === 'IN_PROGRESS' && (
                        <button
                          title="Mark Complete"
                          onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {['CONFIRMED', 'PENDING'].includes(apt.status) && (
                        <>
                          <button
                            title="Send SMS Reminder"
                            onClick={() => handleSendReminder(apt.id, apt.customer_name)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Bell className="w-4 h-4" />
                          </button>

                          <button
                            title="Mark as No-Show"
                            onClick={() => handleStatusChange(apt.id, 'NO_SHOW')}
                            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {['CONFIRMED', 'PENDING'].includes(apt.status) && (
                        <button
                          title="Cancel Booking"
                          onClick={() => handleStatusChange(apt.id, 'CANCELLED')}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
