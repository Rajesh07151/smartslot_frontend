import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BookingWizard from './components/customer/BookingWizard';
import ManageBooking from './components/customer/ManageBooking';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminHeader from './components/admin/AdminHeader';
import AdminLoginGate from './components/admin/AdminLoginGate';
import CustomerAuthModal from './components/customer/CustomerAuthModal';
import { ShieldCheck, User, LayoutDashboard, Lock, LogIn, LogOut, Eye } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, isAdmin, logout, openCustomerAuth } = useAuth();
  const [previewCustomerView, setPreviewCustomerView] = useState(false);

  // Determine initial tab from URL hash (#manage, #book) or path (/manage)
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash === 'admin') return isAdmin ? 'admin' : 'book';
    if (['manage', 'book'].includes(hash)) return hash;
    if (window.location.pathname.includes('admin')) return isAdmin ? 'admin' : 'book';
    if (window.location.pathname.includes('manage')) return 'manage';
    return 'book';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [managePrefill, setManagePrefill] = useState(null);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['admin', 'manage', 'book'].includes(hash)) {
        setActiveTabState(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleBookingSuccess = (booking) => {
    // Keep booking state if needed
  };

  const handleGoToManage = (referenceCode) => {
    setManagePrefill(referenceCode);
    setActiveTab('manage');
  };

  // If logged in as Admin and not previewing customer site: ONLY show Admin functionality and options!
  if (isAdmin && !previewCustomerView) {
    return (
      <div className="min-h-screen bg-slate-50/70 flex flex-col text-slate-800 font-sans">
        {/* Dedicated Admin Header - ONLY ADMIN OPTIONS */}
        <AdminHeader
          isPreviewMode={false}
          onTogglePreview={() => setPreviewCustomerView(true)}
        />

        {/* Dedicated Admin Operations Dashboard */}
        <main className="flex-grow">
          <AdminDashboard />
        </main>

        {/* Dedicated Admin Operations Footer */}
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-4 px-4 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-200 font-medium">SmartSlot Operations Console</span>
              <span className="text-slate-600">•</span>
              <span>All Systems Operational</span>
            </div>
            <p className="text-slate-500">
              Facility Management & Workshop Operations Control System
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col text-slate-800 font-sans">
      {/* Admin Preview Mode Banner (shown only when Admin explicitly toggles preview) */}
      {isAdmin && previewCustomerView && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Admin Preview Mode: Viewing customer-facing booking portal</span>
          </div>
          <button
            onClick={() => setPreviewCustomerView(false)}
            className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs"
          >
            Return to Admin Operations Dashboard &rarr;
          </button>
        </div>
      )}

      {/* Top Utility Bar */}
      <div className="bg-white border-b border-slate-200/80 text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">SmartSlot Auto Care</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 hidden sm:inline">Certified Multi-Bay Workshop &bull; New Delhi / NCR</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Customer Support: <strong>+91 98201 12345</strong></span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        {activeTab === 'book' && (
          <BookingWizard
            onBookingSuccess={handleBookingSuccess}
            onManageBookingClick={handleGoToManage}
          />
        )}

        {activeTab === 'manage' && (
          <ManageBooking
            prefillReference={managePrefill}
          />
        )}

        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminDashboard />
          ) : (
            <AdminLoginGate
              onLoginSuccess={() => setActiveTab('admin')}
              onCancel={() => setActiveTab('book')}
            />
          )
        )}
      </main>

      {/* Customer Registration & Login Modal */}
      <CustomerAuthModal
        onAdminLoginSuccess={() => setActiveTab('admin')}
        onCustomerLoginSuccess={() => setActiveTab('manage')}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-slate-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
              ₹
            </div>
            <span className="font-semibold text-slate-800">SmartSlot India</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Secure Service Operations System</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 text-xs">
            <button
              onClick={() => setActiveTab('admin')}
              className="text-slate-700 hover:text-slate-900 font-semibold underline flex items-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Login Portal</span>
            </button>
            <span>•</span>
            <button
              onClick={() => openCustomerAuth('register')}
              className="text-slate-700 hover:text-slate-900 font-medium underline"
            >
              Customer Registration
            </button>
            <span>•</span>
            <span>All Rates in INR (₹)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
