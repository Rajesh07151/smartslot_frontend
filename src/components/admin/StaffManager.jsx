import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { formatINR, formatDuration } from '../../utils/formatters';
import {
  User, Clock, Shield, Check, Edit2, Save, X, CheckCircle2,
  Calendar, Briefcase, Plus, AlertCircle, Trash2, Phone, Mail,
  RefreshCw, AlertTriangle, Search
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
];

const DEFAULT_SCHEDULES = [
  { day_of_week: 0, start_time: '09:00', end_time: '17:00', break_start: '13:00', break_end: '14:00', is_working: 0 },
  { day_of_week: 1, start_time: '08:30', end_time: '17:00', break_start: '12:30', break_end: '13:30', is_working: 1 },
  { day_of_week: 2, start_time: '08:30', end_time: '17:00', break_start: '12:30', break_end: '13:30', is_working: 1 },
  { day_of_week: 3, start_time: '08:30', end_time: '17:00', break_start: '12:30', break_end: '13:30', is_working: 1 },
  { day_of_week: 4, start_time: '08:30', end_time: '17:00', break_start: '12:30', break_end: '13:30', is_working: 1 },
  { day_of_week: 5, start_time: '08:30', end_time: '17:00', break_start: '12:30', break_end: '13:30', is_working: 1 },
  { day_of_week: 6, start_time: '09:00', end_time: '14:00', break_start: null, break_end: null, is_working: 1 }
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StaffManager() {
  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modal states: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('profile'); // 'profile' | 'services' | 'schedule'
  const [modalLoading, setModalLoading] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    role: '',
    email: '',
    phone: '',
    avatar: PRESET_AVATARS[0],
    bio: '',
    serviceIds: [],
    schedules: JSON.parse(JSON.stringify(DEFAULT_SCHEDULES))
  });

  // Delete modal state
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffData, servicesData] = await Promise.all([
        api.getStaff(),
        api.getServices()
      ]);
      setStaffList(staffData);
      setServices(servicesData);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load live technicians: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      id: null,
      name: '',
      role: 'Certified Service Specialist',
      email: '',
      phone: '+91 ',
      avatar: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
      bio: 'Experienced automotive specialist dedicated to precision service & customer satisfaction.',
      serviceIds: services.slice(0, 3).map(s => s.id),
      schedules: JSON.parse(JSON.stringify(DEFAULT_SCHEDULES))
    });
    setActiveModalTab('profile');
    setErrorMessage(null);
    setModalMode('add');
  };

  // Open Edit Modal
  const openEditModal = (staff) => {
    // Merge existing schedules with defaults to ensure all 7 days exist
    const fullSchedules = DEFAULT_SCHEDULES.map(def => {
      const match = staff.schedules?.find(s => s.day_of_week === def.day_of_week);
      return match ? { ...match } : { ...def };
    });

    setFormData({
      id: staff.id,
      name: staff.name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone || '',
      avatar: staff.avatar || PRESET_AVATARS[0],
      bio: staff.bio || '',
      serviceIds: staff.services ? staff.services.map(s => s.id) : [],
      schedules: fullSchedules
    });
    setActiveModalTab('profile');
    setErrorMessage(null);
    setModalMode('edit');
  };

  const handleToggleService = (serviceId) => {
    setFormData(prev => {
      const exists = prev.serviceIds.includes(serviceId);
      return {
        ...prev,
        serviceIds: exists
          ? prev.serviceIds.filter(id => id !== serviceId)
          : [...prev.serviceIds, serviceId]
      };
    });
  };

  const handleScheduleChange = (dayIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.map(sch => {
        if (sch.day_of_week === dayIndex) {
          return { ...sch, [field]: value };
        }
        return sch;
      })
    }));
  };

  // Save (Create or Update)
  const handleSaveTechnician = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim() || !formData.role.trim() || !formData.email.trim()) {
      setErrorMessage('Technician name, role, and email address are required.');
      return;
    }

    try {
      setModalLoading(true);
      setErrorMessage(null);

      const payload = {
        name: formData.name.trim(),
        role: formData.role.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar,
        bio: formData.bio.trim(),
        serviceIds: formData.serviceIds,
        schedules: formData.schedules
      };

      if (modalMode === 'add') {
        await api.createStaff(payload);
        showToast(`Technician ${formData.name} added to live schedule!`);
      } else {
        await api.updateStaff(formData.id, payload);
        showToast(`Technician ${formData.name} updated successfully!`);
      }

      setModalMode(null);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Operation failed');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Technician
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    try {
      setDeleteLoading(true);
      setErrorMessage(null);
      await api.deleteStaff(deletingStaff.id);
      showToast(`Technician ${deletingStaff.name} removed successfully.`);
      setDeletingStaff(null);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Could not delete technician.');
      setDeletingStaff(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.services && s.services.some(srv => srv.name.toLowerCase().includes(q)));
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-auto text-emerald-600 font-bold">&times;</button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-600 font-bold">&times;</button>
        </div>
      )}

      {/* Top Operations Header & Add Action */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Technicians & Specialists</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live database management for technician bay assignments, working hours, and certified service qualifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search technicians or skill..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-all shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Technician</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Live Technicians"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Technicians Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-600 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading live technicians from database...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
          No technicians found matching "{searchTerm}". Click "+ Add Technician" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map(staff => (
            <div key={staff.id} className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                {/* Header & Avatar */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={staff.avatar}
                      alt={staff.name}
                      onError={(e) => { e.target.src = PRESET_AVATARS[0]; }}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-tight">{staff.name}</h3>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">{staff.role}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{staff.phone || staff.email}</p>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(staff)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Edit technician details, skills, or hours"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingStaff(staff)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete technician"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                  {staff.bio || 'Certified vehicle specialist for workshop operations.'}
                </p>

                {/* Working Shifts Summary */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Live Schedule (Mon - Sat)
                  </span>
                  <div className="space-y-1">
                    {staff.schedules && staff.schedules.slice(1, 7).map(sch => (
                      <div key={sch.day_of_week} className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">{dayNames[sch.day_of_week]}:</span>
                        {sch.is_working ? (
                          <span className="text-slate-800">
                            {sch.start_time} - {sch.end_time}
                            {sch.break_start && <span className="text-slate-400 text-[10px] ml-1">(Lunch {sch.break_start})</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Day Off</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certified Services */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Certified Capabilities ({staff.services ? staff.services.length : 0})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {staff.services && staff.services.length > 0 ? (
                      staff.services.map(srv => (
                        <span key={srv.id} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {srv.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No services assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Active in Live Booking</span>
                </span>
                <button
                  onClick={() => openEditModal(staff)}
                  className="text-xs font-semibold text-slate-800 hover:text-blue-600 transition-colors"
                >
                  Configure &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT TECHNICIAN MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  {modalMode === 'add' ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    {modalMode === 'add' ? 'Add New Technician' : `Edit Technician: ${formData.name}`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {modalMode === 'add' ? 'Register technician for live bay allocation and booking.' : 'Update capabilities, contact, and weekly working shifts.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex rounded-lg bg-slate-100 p-1 my-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveModalTab('profile')}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  activeModalTab === 'profile' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Profile & Avatar
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('services')}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  activeModalTab === 'services' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Certified Services ({formData.serviceIds.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('schedule')}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  activeModalTab === 'schedule' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Weekly Shifts
              </button>
            </div>

            {/* TAB 1: PROFILE & AVATAR */}
            {activeModalTab === 'profile' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arjun Sharma"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Specialist Role *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engine & Transmission Lead"
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="arjun@smartslot.service"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (India +91)</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>

                {/* Avatar Presets Selection */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Choose Technician Portrait Photo</label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {PRESET_AVATARS.map((url, idx) => {
                      const isSelected = formData.avatar === url;
                      return (
                        <img
                          key={idx}
                          src={url}
                          alt={`Preset ${idx}`}
                          onClick={() => setFormData({ ...formData, avatar: url })}
                          className={`w-12 h-12 rounded-xl object-cover cursor-pointer border-2 transition-all ${
                            isSelected ? 'border-slate-900 ring-2 ring-slate-800 scale-105 shadow-xs' : 'border-slate-200 hover:border-slate-400'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <input
                    type="url"
                    placeholder="Or enter custom image URL"
                    value={formData.avatar}
                    onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                    className="w-full mt-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Professional Bio / Experience</label>
                  <textarea
                    rows={2}
                    placeholder="Brief background on certifications, OEM training, or vehicle specialties."
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: CERTIFIED SERVICES */}
            {activeModalTab === 'services' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <p className="text-slate-500">
                    Select which services <strong className="text-slate-800">{formData.name || 'this technician'}</strong> is qualified to handle. Only qualified staff appear when a customer books that service.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, serviceIds: services.map(s => s.id) })}
                    className="text-xs text-blue-600 hover:underline font-semibold ml-2 whitespace-nowrap"
                  >
                    Select All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/80">
                  {services.map(srv => {
                    const isChecked = formData.serviceIds.includes(srv.id);
                    return (
                      <label
                        key={srv.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked ? 'bg-white border-slate-900 text-slate-900 font-medium shadow-xs' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleService(srv.id)}
                          className="mt-0.5 rounded text-slate-900"
                        />
                        <div className="text-xs">
                          <span className="font-semibold block">{srv.name}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {srv.category} • {formatDuration(srv.duration_minutes)} • <strong className="text-slate-800">{formatINR(srv.price)}</strong>
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: WEEKLY SHIFTS */}
            {activeModalTab === 'schedule' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Configure working days and shift hours. The customer booking system checks these exact hours and excludes lunch breaks automatically.
                </p>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 max-h-72 overflow-y-auto">
                  {formData.schedules.map(sch => (
                    <div key={sch.day_of_week} className="flex flex-wrap items-center justify-between gap-2 text-xs py-1.5 border-b border-slate-100 last:border-b-0">
                      <div className="w-24 font-semibold text-slate-800">{dayNames[sch.day_of_week]}</div>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!sch.is_working}
                          onChange={e => handleScheduleChange(sch.day_of_week, 'is_working', e.target.checked ? 1 : 0)}
                          className="rounded text-slate-900"
                        />
                        <span className="text-slate-700 font-medium">Working Day</span>
                      </label>

                      {sch.is_working ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={sch.start_time}
                            onChange={e => handleScheduleChange(sch.day_of_week, 'start_time', e.target.value)}
                            className="px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="time"
                            value={sch.end_time}
                            onChange={e => handleScheduleChange(sch.day_of_week, 'end_time', e.target.value)}
                            className="px-2 py-1 rounded border border-slate-200 text-xs bg-white"
                          />
                          <span className="text-slate-400 ml-1">Lunch:</span>
                          <input
                            type="time"
                            value={sch.break_start || ''}
                            onChange={e => handleScheduleChange(sch.day_of_week, 'break_start', e.target.value || null)}
                            className="px-1.5 py-1 rounded border border-slate-200 text-xs bg-white"
                          />
                          <span className="text-slate-400">-</span>
                          <input
                            type="time"
                            value={sch.break_end || ''}
                            onChange={e => handleScheduleChange(sch.day_of_week, 'break_end', e.target.value || null)}
                            className="px-1.5 py-1 rounded border border-slate-200 text-xs bg-white"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Day Off (No slots generated)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeModalTab !== 'profile' && (
                  <button
                    type="button"
                    onClick={() => setActiveModalTab(activeModalTab === 'schedule' ? 'services' : 'profile')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    &larr; Previous Tab
                  </button>
                )}
                {activeModalTab !== 'schedule' && (
                  <button
                    type="button"
                    onClick={() => setActiveModalTab(activeModalTab === 'profile' ? 'services' : 'schedule')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
                  >
                    Next Tab &rarr;
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-medium hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={handleSaveTechnician}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-xs hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {modalLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{modalMode === 'add' ? 'Create Technician' : 'Save Changes'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Delete Technician?</h2>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <strong>{deletingStaff.name}</strong> ({deletingStaff.role}) from the live technician roster?
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mb-4 flex items-center gap-3">
              <img
                src={deletingStaff.avatar}
                alt={deletingStaff.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
              />
              <div>
                <span className="font-semibold text-slate-900">{deletingStaff.name}</span>
                <p className="text-[11px] text-slate-400">{deletingStaff.email}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-6">
              * Active upcoming appointments booked with this technician must be completed or rescheduled before deletion.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-medium hover:bg-slate-100"
              >
                Keep Technician
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-medium shadow-xs hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1"
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
