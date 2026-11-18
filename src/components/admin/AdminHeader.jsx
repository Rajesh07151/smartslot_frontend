import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, Eye, LayoutDashboard, Wrench, ExternalLink } from 'lucide-react';

export default function AdminHeader({ isPreviewMode, onTogglePreview }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Admin Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/15">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  Smart<span className="text-blue-400">Slot</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Operations Console
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Workshop Bay Allocation & Certified Service Management
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-3">
            {/* Preview Customer View Toggle */}
            <button
              onClick={onTogglePreview}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                isPreviewMode
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title="Preview Customer Facing Portal"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isPreviewMode ? 'Return to Admin Dashboard' : 'Preview Customer Portal'}
              </span>
            </button>

            {/* Admin Profile Pill */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] border border-emerald-500/30">
                A
              </div>
              <div className="text-left">
                <span className="block font-semibold text-slate-200 leading-tight">
                  {user?.name || 'Operations Lead'}
                </span>
                <span className="block text-[10px] text-slate-400 uppercase font-medium">
                  Facility Admin
                </span>
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={logout}
              title="Sign Out of Admin Console"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
