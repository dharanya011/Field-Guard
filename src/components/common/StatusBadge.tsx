import React from 'react';
import type { InspectionStatus, SyncState, RiskLevel } from '../../types';

interface StatusBadgeProps {
  status?: InspectionStatus | SyncState | RiskLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'PENDING',
  size = 'md',
  showDot = true
}) => {
  const norm = String(status).toUpperCase();

  // Status mapping strictly adhering to requirement:
  // 🟢 Success / PASS / Synced
  // 🟠 Warning / Pending
  // 🔴 FAIL / Critical / Conflict
  // 🔵 Syncing / Information
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  let label = status;

  if (norm === 'PASS' || norm === 'PASSED' || norm === 'SYNCED' || norm === 'OPERATIONAL' || norm === 'RESOLVED' || norm === 'LOW') {
    colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
    dotColor = 'bg-emerald-500';
    label = norm === 'PASS' || norm === 'PASSED' ? 'PASSED' : norm === 'SYNCED' ? 'SYNCED' : norm;
  } else if (norm === 'WARNING' || norm === 'PENDING' || norm === 'PENDING_REVIEW' || norm === 'NEEDS_MAINTENANCE' || norm === 'MEDIUM') {
    colorStyles = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
    dotColor = 'bg-amber-500';
    label = norm === 'PENDING_REVIEW' ? 'PENDING REVIEW' : norm;
  } else if (norm === 'FAIL' || norm === 'FAILED' || norm === 'CRITICAL' || norm === 'CRITICAL_OFFLINE' || norm === 'CONFLICT' || norm === 'HIGH') {
    colorStyles = 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';
    dotColor = 'bg-rose-500';
    label = norm === 'CRITICAL_OFFLINE' ? 'CRITICAL OFFLINE' : norm;
  } else if (norm === 'SYNCING' || norm === 'IN_PROGRESS' || norm === 'INFO' || norm === 'INFORMATION') {
    colorStyles = 'bg-sky-50 text-sky-800 border-sky-200 font-semibold';
    dotColor = 'bg-sky-500';
    label = norm === 'IN_PROGRESS' ? 'IN PROGRESS' : norm;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs tracking-wide uppercase transition-colors whitespace-nowrap ${colorStyles} ${sizeClasses}`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColor} ${norm === 'SYNCING' ? 'animate-pulse' : ''}`}
        />
      )}
      <span>{label}</span>
    </span>
  );
};
