import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, ShieldAlert, KeyRound, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function AdminLoginGate({ onLoginSuccess, onCancel }) {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both administrator email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await adminLogin(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@smartslot.service');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 shadow-xs">
          <Lock className="w-6 h-6 text-slate-100" />
        </div>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/60">
              Restricted Area
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Admin Authentication</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign in with authorized facility credentials to access operations, bay schedules, and pricing matrix.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-grow">
              <p className="font-semibold">Access Denied</p>
              <p className="text-rose-700 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">&times;</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Admin Email Address</label>
            <input
              type="email"
              required
              placeholder="admin@smartslot.service"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Sign In to Admin Panel</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Quick Pill */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 mb-2">Facility Manager Demo Account:</p>
          <button
            type="button"
            onClick={handleFillDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-mono text-[11px] transition-colors border border-slate-200"
          >
            <span>admin@smartslot.service</span>
            <span className="text-slate-400">•</span>
            <span>admin123</span>
          </button>
        </div>

        {onCancel && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Customer Portal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
