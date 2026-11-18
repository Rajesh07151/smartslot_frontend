import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Search, LayoutDashboard, Wrench, ShieldCheck, UserCheck, Lock, User, LogOut, LogIn, ClipboardList } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, isAuthenticated, isAdmin, isCustomer, logout, openCustomerAuth } = useAuth();

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => setActiveTab('book')}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs group-hover:bg-slate-800 transition-colors">
              <Wrench className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  Smart<span className="text-blue-600">Slot</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                  Auto Care
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Vehicle Service & Bay Allocation
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setActiveTab('book')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'book'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Book Appointment</span>
            </button>

            <button
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'manage'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {isAuthenticated && !isAdmin ? (
                <>
                  <ClipboardList className="w-4 h-4 text-slate-600" />
                  <span>My Bookings</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>Track Booking</span>
                </>
              )}
            </button>
          </nav>

          {/* User Profile / Registration / Login Action */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1 text-xs">
                <button
                  onClick={() => setActiveTab(isAdmin ? 'admin' : 'manage')}
                  title={isAdmin ? "Open Admin Panel" : "View My Bookings & Order Status"}
                  className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">
                      {user.role}
                    </span>
                  </div>
                </button>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openCustomerAuth('login')}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openCustomerAuth('register')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-all shadow-xs"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
