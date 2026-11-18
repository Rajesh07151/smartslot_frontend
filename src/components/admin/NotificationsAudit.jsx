import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Mail, MessageSquare, Clock, CheckCircle2, RefreshCw, Send, ShieldCheck } from 'lucide-react';

export default function NotificationsAudit() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications(40);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Communication & Notification Audit Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated confirmation notices, 24h & 2h SMS reminders dispatched to customers to eliminate no-shows.
          </p>
        </div>
        <button
          onClick={loadNotifications}
          disabled={loading}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          title="Refresh Log"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-600" />
            <span className="text-xs">Loading communications pipeline...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No notifications logged yet.
          </div>
        ) : (
          notifications.map(n => {
            const isEmail = n.channel === 'EMAIL';
            return (
              <div key={n.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex items-start gap-3.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isEmail ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {isEmail ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>

                <div className="flex-grow text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{n.recipient_name}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">{isEmail ? n.recipient_email : n.recipient_phone}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        isEmail ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {n.channel}
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/50">
                        {n.booking_reference}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{n.sent_at}</span>
                    </div>
                  </div>

                  {n.subject && (
                    <h5 className="font-medium text-slate-800 text-xs mb-0.5">{n.subject}</h5>
                  )}
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-[11px] font-mono">
                    {n.message}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Delivered</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
