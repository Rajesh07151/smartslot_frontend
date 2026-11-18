import React from 'react';
import { CheckCircle2, Clock, PlayCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  const configs = {
    CONFIRMED: {
      bg: 'bg-slate-100 text-slate-800 border-slate-200',
      icon: Clock,
      label: 'Confirmed'
    },
    IN_PROGRESS: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: PlayCircle,
      label: 'In Progress'
    },
    COMPLETED: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      label: 'Completed'
    },
    CANCELLED: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200 opacity-90',
      icon: XCircle,
      label: 'Cancelled'
    },
    NO_SHOW: {
      bg: 'bg-purple-50 text-purple-800 border-purple-200',
      icon: AlertTriangle,
      label: 'No-Show'
    },
    PENDING: {
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: HelpCircle,
      label: 'Pending'
    }
  };

  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium border rounded-md ${config.bg} ${sizeClasses}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
