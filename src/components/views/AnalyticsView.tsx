import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Activity, 
  Download 
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { StatusBadge } from '../common/StatusBadge';

export const AnalyticsView: React.FC = () => {
  const { inspections, equipments } = useInspections();

  const total = inspections.length;
  const passed = inspections.filter(i => i.status === 'PASSED').length;
  const failed = inspections.filter(i => i.status === 'FAILED').length;
  const inProgress = inspections.filter(i => i.status === 'IN_PROGRESS').length;
  const pendingReview = inspections.filter(i => i.status === 'PENDING_REVIEW').length;
  const conflicts = inspections.filter(i => i.status === 'CONFLICT').length;

  const totalDefects = inspections.reduce((acc, curr) => acc + curr.defects.length, 0);
  const criticalDefects = inspections.reduce(
    (acc, curr) => acc + curr.defects.filter(d => d.severity === 'CRITICAL').length,
    0
  );
  const highDefects = inspections.reduce(
    (acc, curr) => acc + curr.defects.filter(d => d.severity === 'HIGH').length,
    0
  );
  const mediumDefects = inspections.reduce(
    (acc, curr) => acc + curr.defects.filter(d => d.severity === 'MEDIUM').length,
    0
  );

  const averageScore = total > 0
    ? Math.round(inspections.reduce((sum, i) => sum + i.score, 0) / total)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50/40 to-white border border-blue-200 shadow-sm">
        <div>
          <span className="text-xs font-mono font-bold text-blue-700 uppercase tracking-wider">
            SAFETY & RELIABILITY INTELLIGENCE
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight font-display">
            Fleet Inspection Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Asset compliance metrics, failure distributions, defect trends, and mechanical tolerance health.
          </p>
        </div>

        <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition self-start sm:self-auto">
          <Download className="w-4 h-4 text-blue-600" />
          <span>Export ISO Report</span>
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Average Compliance</span>
          <p className="text-3xl font-bold text-emerald-700 font-mono mt-1">{averageScore}%</p>
          <p className="text-[11px] text-slate-400 mt-1">Across all plant zones</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Defects Detected</span>
          <p className="text-3xl font-bold text-rose-700 font-mono mt-1">{totalDefects}</p>
          <p className="text-[11px] text-rose-700 font-semibold mt-1">{criticalDefects} critical lockouts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Active Work Orders</span>
          <p className="text-3xl font-bold text-blue-700 font-mono mt-1">{inProgress + pendingReview}</p>
          <p className="text-[11px] text-slate-400 mt-1">{pendingReview} awaiting sign-off</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Equipment Fleet Health</span>
          <p className="text-3xl font-bold text-sky-700 font-mono mt-1">
            {Math.round(equipments.reduce((sum, e) => sum + e.healthScore, 0) / Math.max(1, equipments.length))}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{equipments.length} tracked assets</p>
        </div>
      </div>

      {/* Distribution Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">Inspection Lifecycle Distribution</h2>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>

          <div className="space-y-3">
            {[
              { label: 'Passed / Verified', count: passed, color: 'bg-emerald-500', text: 'text-emerald-700' },
              { label: 'Pending Review', count: pendingReview, color: 'bg-amber-500', text: 'text-amber-700' },
              { label: 'In Progress (Field)', count: inProgress, color: 'bg-sky-500', text: 'text-sky-700' },
              { label: 'Failed (Out of Spec)', count: failed, color: 'bg-rose-500', text: 'text-rose-700' },
              { label: 'CRDT Conflict', count: conflicts, color: 'bg-purple-500', text: 'text-purple-700' }
            ].map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className={`font-mono font-bold ${item.text}`}>{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div className={`h-full ${item.color}`} style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Defect Severity Breakdown */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">Defect Severity Breakdown</h2>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200">
              <span className="text-rose-800 font-bold block mb-1">CRITICAL (Lockout)</span>
              <p className="text-2xl font-bold font-mono text-slate-900">{criticalDefects}</p>
              <p className="text-[10px] text-slate-500 mt-1">Requires immediate physical overhaul.</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/30 border border-rose-200">
              <span className="text-rose-700 font-bold block mb-1">HIGH (Seal / Leak)</span>
              <p className="text-2xl font-bold font-mono text-slate-900">{highDefects}</p>
              <p className="text-[10px] text-slate-500 mt-1">Action required before next cycle.</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
              <span className="text-amber-800 font-bold block mb-1">MEDIUM (Cavitation)</span>
              <p className="text-2xl font-bold font-mono text-slate-900">{mediumDefects}</p>
              <p className="text-[10px] text-slate-500 mt-1">Monitor within 48-hour window.</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <span className="text-emerald-800 font-bold block mb-1">LOW (Cosmetic)</span>
              <p className="text-2xl font-bold font-mono text-slate-900">0</p>
              <p className="text-[10px] text-slate-500 mt-1">Routine cleaning / adjustment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
