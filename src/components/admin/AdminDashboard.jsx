import React, { useState, useEffect } from 'react';
import CalendarView from './CalendarView';
import AppointmentsTable from './AppointmentsTable';
import StaffManager from './StaffManager';
import ServicesManager from './ServicesManager';
import AnalyticsView from './AnalyticsView';
import NotificationsAudit from './NotificationsAudit';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/formatters';
import {
  Calendar, Table, Users, Wrench, BarChart3, Bell,
  IndianRupee, Activity, AlertTriangle, CheckCircle2, PlayCircle, RefreshCw, LayoutDashboard, LogOut, ShieldCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('appointments'); // Default to 'appointments' so user immediately sees all bookings!
  const [quickStats, setQuickStats] = useState(null);

  useEffect(() => {
    loadQuickStats();
  }, [activeSubTab]);

  const loadQuickStats = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [analyticsData, todayApts] = await Promise.all([
        api.getAnalytics(),
        api.getAppointments({ date: todayStr })
      ]);

      const inProgressCount = todayApts.filter(a => a.status === 'IN_PROGRESS').length;
      const completedCount = todayApts.filter(a => a.status === 'COMPLETED').length;

      setQuickStats({
        todayCount: todayApts.length,
        inProgressCount,
        completedCount,
        overallUtilization: Math.round(
          analyticsData.staffUtilization.reduce((acc, s) => acc + s.utilizationRate, 0) /
          (analyticsData.staffUtilization.length || 1)
        ),
        noShowRate: analyticsData.kpis.noShowRate,
        realizedRevenue: analyticsData.kpis.realizedRevenue,
        totalAppointments: analyticsData.kpis.totalAppointments
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header & Admin Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Admin & Operations Panel</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Live Control
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Check and control all customer appointments, technician bay allocations, INR pricing, and operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Admin: <strong className="text-slate-900">{user?.name || 'Operations'}</strong></span>
          </div>

          <button
            onClick={logout}
            title="Log Out of Admin Panel"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Quick Ops Metric Strip */}
      {quickStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Today's Appointments</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900">{quickStats.todayCount}</span>
              <span className="text-[11px] text-slate-500">today</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Active In Bay</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-amber-700">{quickStats.inProgressCount}</span>
              <span className="text-[11px] text-amber-700 font-medium">in progress</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Workforce Utilization</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-800">{quickStats.overallUtilization}%</span>
              <span className="text-[11px] text-slate-500">capacity</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">No-Show Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-purple-700">{quickStats.noShowRate}%</span>
              <span className="text-[11px] text-slate-500">mitigated</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Realized Revenue</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-emerald-700">{formatINR(quickStats.realizedRevenue)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="border-b border-slate-200/90 mb-6 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'appointments', label: 'All Bookings & Status', icon: Table },
          { id: 'calendar', label: 'Timeline & Bay Schedule', icon: Calendar },
          { id: 'staff', label: 'Technicians & Schedules', icon: Users },
          { id: 'services', label: 'Services & INR Pricing', icon: Wrench },
          { id: 'analytics', label: 'Revenue & Operations Analytics', icon: BarChart3 },
          { id: 'notifications', label: 'Communication Audit Log', icon: Bell }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? 'border-slate-900 text-slate-900 font-semibold bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Sub-Tab View */}
      {activeSubTab === 'appointments' && <AppointmentsTable />}
      {activeSubTab === 'calendar' && <CalendarView />}
      {activeSubTab === 'staff' && <StaffManager />}
      {activeSubTab === 'services' && <ServicesManager />}
      {activeSubTab === 'analytics' && <AnalyticsView />}
      {activeSubTab === 'notifications' && <NotificationsAudit />}
    </div>
  );
}
