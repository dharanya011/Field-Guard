import React from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Activity, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight,
  TrendingUp,
  User,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInspections } from '../../context/InspectionContext';
import { StatusBadge } from '../common/StatusBadge';
import type { Inspection } from '../../types';

interface SupervisorDashboardProps {
  onSelectInspection: (inspection: Inspection) => void;
  onNavigate: (view: string) => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  onSelectInspection,
  onNavigate
}) => {
  const { currentUser } = useAuth();
  const { inspections, conflicts, auditLogs, changeInspectionStatus } = useInspections();

  // Supervisor metrics as explicitly requested:
  // - Total inspections
  // - Pending review
  // - Active conflicts
  // - Critical risks
  // - Recent activity
  // - AI insights
  const totalInspections = inspections.length;
  const pendingReview = inspections.filter(i => i.status === 'PENDING_REVIEW');
  const activeConflicts = conflicts.filter(c => c.status === 'ACTIVE');
  const criticalRisks = inspections.filter(i => i.riskLevel === 'CRITICAL' || i.riskLevel === 'HIGH');
  const passedInspections = inspections.filter(i => i.status === 'PASSED').length;
  const failedInspections = inspections.filter(i => i.status === 'FAILED').length;

  const passRate = totalInspections > 0 ? Math.round((passedInspections / Math.max(1, passedInspections + failedInspections)) * 100) : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50/50 to-white border border-indigo-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              OPERATIONS SUPERVISOR HUB
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Badge: {currentUser?.badgeNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 tracking-tight font-display">
            Supervisor Operational Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Real-time quality oversight, CRDT divergence resolution, and field safety compliance verification across all active plant sectors.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('conflicts')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-semibold text-xs transition shadow-2xs"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Review Conflicts ({activeConflicts.length})</span>
          </button>

          <button
            onClick={() => onNavigate('analytics')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Full Analytics</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Status Cards (Total inspections, Pending review, Active conflicts, Critical risks) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total inspections */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Inspections</span>
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 font-mono">{totalInspections}</p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="text-emerald-700 font-semibold">{passedInspections} passed</span>
            <span>•</span>
            <span className="text-rose-700 font-semibold">{failedInspections} failed</span>
          </div>
        </div>

        {/* Pending Review */}
        <div 
          onClick={() => onNavigate('inspections')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-amber-300 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-700 font-mono">{pendingReview.length}</p>
          <p className="text-[11px] text-slate-500 mt-2">Awaiting supervisor sign-off</p>
        </div>

        {/* Active Conflicts */}
        <div 
          onClick={() => onNavigate('conflicts')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-rose-300 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Active Conflicts</span>
            <AlertTriangle className={`w-4 h-4 ${activeConflicts.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <p className="text-3xl font-bold text-rose-700 font-mono">{activeConflicts.length}</p>
          <p className="text-[11px] text-slate-500 mt-2">CRDT state divergence</p>
        </div>

        {/* Critical Risks */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Critical Risks</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-bold text-rose-700 font-mono">{criticalRisks.length}</p>
          <p className="text-[11px] text-slate-500 mt-2">High / Critical severity</p>
        </div>
      </div>

      {/* AI Insights Card (Requested as core Supervisor Dashboard item) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white border border-indigo-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight font-display">
              Gemini Field Safety & Reliability Synthesis
            </h2>
          </div>
          <span className="text-[10px] font-mono font-semibold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
            AUTO-GENERATED INSIGHT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="font-bold text-rose-700 block mb-1">Critical Valve Sticking Alert</span>
            <p className="text-slate-600 leading-relaxed">
              Valve <strong className="text-slate-900">RV-88</strong> (Cryo East) failed stroke speed test by 2.8s due to sub-zero icing. Immediate lockout in effect.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="font-bold text-amber-700 block mb-1">Pump Cavitation Pattern</span>
            <p className="text-slate-600 leading-relaxed">
              Dosing Pump <strong className="text-slate-900">P-302</strong> shows 81.4 dB(A) cavitation noise. AI recommends adjusting damper throttle to prevent impeller erosion.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="font-bold text-emerald-700 block mb-1">Vibration Quality Benchmark</span>
            <p className="text-slate-600 leading-relaxed">
              Main Turbine <strong className="text-slate-900">T-400</strong> is in top 5% vibration health (1.18 mm/s RMS vs 2.3 mm/s allowable limit).
            </p>
          </div>
        </div>
      </div>

      {/* Lower Split: Pending Review Queue + Recent Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pending Review Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">Supervisory Approval Queue</h2>
            <span className="text-xs text-slate-500 font-mono font-semibold">
              {pendingReview.length} require validation
            </span>
          </div>

          {pendingReview.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 shadow-2xs">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900">All inspections verified</p>
              <p className="text-xs text-slate-500 mt-1">No pending sign-offs in the queue right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReview.map((insp) => (
                <div
                  key={insp.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-600 font-bold">{insp.code}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-700 font-medium">{insp.equipmentName}</span>
                    </div>
                    <StatusBadge status={insp.riskLevel} size="sm" />
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{insp.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Audited by: <strong className="text-slate-800">{insp.technicianName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => changeInspectionStatus(insp.id, 'PASSED')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </button>
                      <button
                        onClick={() => changeInspectionStatus(insp.id, 'FAILED')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Fail</span>
                      </button>
                      <button
                        onClick={() => onSelectInspection(insp)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Recent Field Activity (Audit Stream) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">Recent Field Activity</h2>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
                  <span className="text-slate-800 font-sans font-semibold">{log.userName}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-slate-900 font-medium">
                  {log.action.replace(/_/g, ' ')}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {log.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
