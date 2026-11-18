import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { formatINR, formatDuration } from '../../utils/formatters';
import { Wrench, Clock, IndianRupee, Edit2, Save, CheckCircle2, Shield } from 'lucide-react';

export default function ServicesManager() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.getServices();
      setServices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateService(editingService.id, {
        price: Number(editingService.price),
        duration_minutes: Number(editingService.duration_minutes),
        buffer_minutes: Number(editingService.buffer_minutes),
        description: editingService.description
      });
      setToastMessage(`Updated configuration for ${editingService.name}`);
      setTimeout(() => setToastMessage(null), 3000);
      setEditingService(null);
      loadServices();
    } catch (err) {
      alert('Error updating service: ' + err.message);
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

      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Services & Pricing Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure service durations, prices in INR (₹), and post-service buffer times.</p>
        </div>
        <span className="text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
          {services.length} Active Services
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Service Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Buffer Time</th>
              <th className="py-3 px-4">Price (INR)</th>
              <th className="py-3 px-4">Staff Qualified</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  {s.name}
                  <p className="text-[11px] text-slate-400 font-normal line-clamp-1">{s.description}</p>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {s.category}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-800">
                  {formatDuration(s.duration_minutes)}
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  {s.buffer_minutes || 10} Mins
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  {formatINR(s.price)}
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {s.qualified_technicians_count} Specialists
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => setEditingService({ ...s })}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                    title="Edit Service"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Edit {editingService.name}</h3>
            <p className="text-xs text-slate-500 mb-4">Update pricing (₹), service execution duration, and bay buffer.</p>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price (₹ INR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editingService.price}
                    onChange={e => setEditingService({ ...editingService, price: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    step="5"
                    required
                    value={editingService.duration_minutes}
                    onChange={e => setEditingService({ ...editingService, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bay Buffer (Minutes)</label>
                  <input
                    type="number"
                    step="5"
                    required
                    value={editingService.buffer_minutes || 10}
                    onChange={e => setEditingService({ ...editingService, buffer_minutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingService.description || ''}
                  onChange={e => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-medium hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-xs hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
