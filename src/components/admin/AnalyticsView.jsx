import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { formatINR } from '../../utils/formatters';
import {
  TrendingUp, Users, IndianRupee, AlertTriangle, Calendar, Clock,
  CheckCircle2, RefreshCw, BarChart3, Activity, ArrowUpRight, ShieldCheck
} from 'lucide-react';

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalytics();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-16 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
        <span className="text-xs sm:text-sm font-medium text-slate-500">Computing operations analytics and utilization...</span>
      </div>
    );
  }

  const { kpis, staffUtilization, serviceDemand, hourlyDistribution, dayOfWeekDistribution } = data;

  return (
    <div className="space-y-6">
      {/* Top Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Bookings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Bookings</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{kpis.totalAppointments}</span>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{kpis.completedAppointments} Completed</span>
          </div>
        </div>

        {/* Realized Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Realized Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900">{formatINR(kpis.realizedRevenue)}</span>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Completed orders only</p>
          {kpis.projectedRevenue > 0 && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              +{formatINR(kpis.projectedRevenue)} active pipeline
            </p>
          )}
        </div>

        {/* Avg Staff Utilization */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Staff Utilization</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-800">
            {Math.round(staffUtilization.reduce((acc, s) => acc + s.utilizationRate, 0) / (staffUtilization.length || 1))}%
          </span>
          <p className="text-[11px] text-slate-400 mt-2">Booked vs available capacity</p>
        </div>

        {/* No-Show Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">No-Show Rate</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700">{kpis.noShowRate}%</span>
            <span className="text-xs text-slate-500">({kpis.noShowAppointments} missed)</span>
          </div>
          <span className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700">
            Past visits resolved
          </span>
        </div>

        {/* Lost to No-Shows */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Lost to No-Shows</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
            </div>
          </div>
          <span className="text-2xl font-bold text-rose-700">{formatINR(kpis.lostRevenueNoShow)}</span>
          <p className="text-[11px] text-slate-400 mt-2">Unrecovered bay slots</p>
        </div>
      </div>

      {/* Staff Utilization Detailed Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Specialist Workforce Utilization</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ratio of actual service delivery time to scheduled working hours.</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">5 Active Specialists</span>
        </div>

        <div className="space-y-3">
          {staffUtilization.map(staff => (
            <div key={staff.staffId} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <img
                    src={staff.avatar}
                    alt={staff.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">{staff.name}</h4>
                    <p className="text-xs text-slate-500">{staff.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Jobs</span>
                    <strong className="text-slate-800 font-medium">{staff.totalJobs} completed</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Revenue</span>
                    <strong className="text-emerald-700 font-semibold">{formatINR(staff.revenue)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Utilization</span>
                    <strong className="text-slate-900 font-bold">{staff.utilizationRate}%</strong>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    staff.utilizationRate > 80
                      ? 'bg-emerald-600'
                      : staff.utilizationRate > 50
                      ? 'bg-slate-800'
                      : 'bg-amber-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, staff.utilizationRate))}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Service Demand & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Demand */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Service Demand & Revenue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Top performing service categories by customer booking volume.</p>
            </div>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-2.5">
            {serviceDemand.slice(0, 6).map(srv => (
              <div key={srv.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-900">{srv.name}</h4>
                  <span className="text-[10px] font-medium text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">
                    {srv.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-900 text-xs block">{srv.booking_count} bookings</span>
                  <span className="text-[11px] text-emerald-700 font-medium">{formatINR(srv.total_revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours Distribution */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Peak Booking Hours</h3>
                <p className="text-xs text-slate-500 mt-0.5">Appointment volume distribution throughout operating hours.</p>
              </div>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>

            {/* Visual Bar Chart */}
            <div className="space-y-2 mt-4">
              {hourlyDistribution.map(h => {
                const maxCount = Math.max(...hourlyDistribution.map(x => x.count), 1);
                const percent = Math.round((h.count / maxCount) * 100);

                return (
                  <div key={h.hour_slot} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-medium text-slate-600 text-right">{h.hour_slot}</span>
                    <div className="flex-grow bg-slate-100 rounded-full h-3.5 overflow-hidden">
                      <div
                        className="bg-slate-800 h-3.5 rounded-full transition-all flex items-center justify-end pr-2 text-[10px] text-white font-medium"
                        style={{ width: `${Math.max(12, percent)}%` }}
                      >
                        {h.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
            <Activity className="w-4 h-4 text-slate-400" />
            <span>Peak capacity clusters between 09:00 - 11:30 and 13:30 - 15:00.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
