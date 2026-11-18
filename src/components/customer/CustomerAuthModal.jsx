import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Car, Lock, X, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, ShieldCheck, Shield } from 'lucide-react';

export default function CustomerAuthModal({ onAdminLoginSuccess, onCustomerLoginSuccess }) {
  const { authModalState, closeCustomerAuth, login, register, adminLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'login' | 'admin'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Customer Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle_details: '',
    password: '',
    confirm_password: ''
  });

  // Admin Form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    if (authModalState.isOpen) {
      setActiveTab(authModalState.defaultTab || 'register');
      setError(null);
      setSuccess(null);
    }
  }, [authModalState.isOpen, authModalState.defaultTab]);

  if (!authModalState.isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError('Name, email, and phone number are required.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        vehicle_details: formData.vehicle_details.trim(),
        password: formData.password
      });

      setSuccess('Account created successfully! Welcome to SmartSlot.');
      setTimeout(() => {
        closeCustomerAuth();
        if (onCustomerLoginSuccess) onCustomerLoginSuccess();
      }, 700);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setError('Please provide email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(formData.email.trim(), formData.password);
      setSuccess('Signed in successfully!');
      setTimeout(() => {
        closeCustomerAuth();
        if (onCustomerLoginSuccess) onCustomerLoginSuccess();
      }, 600);
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) {
      setError('Please provide administrator email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await adminLogin(adminEmail.trim(), adminPassword);
      setSuccess('Admin credentials verified! Loading operations dashboard...');
      setTimeout(() => {
        closeCustomerAuth();
        if (onAdminLoginSuccess) onAdminLoginSuccess();
      }, 600);
    } catch (err) {
      setError(err.message || 'Administrator authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoCustomer = () => {
    setFormData({
      ...formData,
      email: 'harsha121@gmail.com',
      password: 'harsha123'
    });
    setError(null);
  };

  const handleFillDemoAdmin = () => {
    setAdminEmail('admin@smartslot.service');
    setAdminPassword('admin123');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {activeTab === 'register' && 'Create Customer Account'}
              {activeTab === 'login' && 'Customer Sign In'}
              {activeTab === 'admin' && 'Administrator Sign In'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'register' && 'Register with your basic details to book and track services.'}
              {activeTab === 'login' && 'Sign in to access your appointments and live order status.'}
              {activeTab === 'admin' && 'Authorized operations personnel & workshop facility access.'}
            </p>
          </div>
          <button
            onClick={closeCustomerAuth}
            className="text-slate-400 hover:text-slate-700 text-2xl font-bold leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Customer Tab Toggle (ONLY shown for customer registration & sign in) */}
        {activeTab !== 'admin' && (
          <div className="flex rounded-lg bg-slate-100 p-1 my-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError(null); }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                activeTab === 'register' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register New Account
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(null); }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                activeTab === 'login' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Sign In
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* TAB 1: CUSTOMER REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  name="name"
                  placeholder="e.g. Vikram Patel"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    name="email"
                    placeholder="vikram@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vehicle Details (Make, Model, Year)</label>
              <div className="relative">
                <Car className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="vehicle_details"
                  placeholder="e.g. Tata Nexon EV / Hyundai Creta"
                  value={formData.vehicle_details}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    name="password"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    name="confirm_password"
                    placeholder="Re-enter password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Complete Registration</span>}
            </button>
          </form>
        )}

        {/* TAB 2: CUSTOMER SIGN IN */}
        {activeTab === 'login' && (
          <form onSubmit={handleCustomerLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  name="email"
                  placeholder="harsha121@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Sign In as Customer</span>}
            </button>

            {/* Switch to Admin Login Option */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleFillDemoCustomer}
                className="text-slate-500 hover:text-slate-800 underline"
              >
                Auto-fill: Harsha
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('admin'); setError(null); }}
                className="font-semibold text-slate-800 hover:text-blue-600 flex items-center gap-1 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>Login as Admin &rarr;</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: ADMIN SIGN IN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLoginSubmit} className="space-y-3.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-xs">Facility & Operations Control</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Restricted
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@smartslot.service"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Access Admin Dashboard</span>
                </>
              )}
            </button>

            {/* Admin autofill and back to customer login */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="text-slate-500 hover:text-slate-800 underline"
              >
                Auto-fill Admin Demo
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(null); }}
                className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Customer Sign In</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
