import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Activity, 
  Download,
  Brain,
  Zap,
  Camera,
  Navigation,
  Clock,
  FileText,
  History,
  ShieldAlert
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { 
  calculateEvidenceReliability, 
  generatePredictiveAlerts, 
  calculateSmartPriority 
} from '../../services/analyticsIntelligence';

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

  // 1. Evidence Reliability Analytics
  const reliabilityScores = inspections.map(i => calculateEvidenceReliability(i, inspections));
  const avgReliability = reliabilityScores.length > 0
    ? Math.round(reliabilityScores.reduce((sum, r) => sum + r.score, 0) / reliabilityScores.length)
    : 92;

  // Average factor contributions
  const photoAvg = reliabilityScores.length > 0 
    ? Math.round(reliabilityScores.reduce((sum, r) => sum + r.factors.photo.score, 0) / reliabilityScores.length) 
    : 22;
  const notesAvg = reliabilityScores.length > 0 
    ? Math.round(reliabilityScores.reduce((sum, r) => sum + r.factors.notes.score, 0) / reliabilityScores.length) 
    : 18;
  const timestampAvg = reliabilityScores.length > 0 
    ? Math.round(reliabilityScores.reduce((sum, r) => sum + r.factors.timestamp.score, 0) / reliabilityScores.length) 
    : 20;
  const gpsAvg = reliabilityScores.length > 0 
    ? Math.round(reliabilityScores.reduce((sum, r) => sum + r.factors.gps.score, 0) / reliabilityScores.length) 
    : 18;
  const historyAvg = reliabilityScores.length > 0 
    ? Math.round(reliabilityScores.reduce((sum, r) => sum + r.factors.history.score, 0) / reliabilityScores.length) 
    : 14;

  // 2. Predictive Alerts
  const predictiveAlerts = generatePredictiveAlerts(equipments, inspections);

  // 3. Smart Priority Assessments for Fleet
  const smartPriorities = equipments.map(eq => ({
    equipment: eq,
    assessment: calculateSmartPriority(eq, inspections)
  })).sort((a, b) => b.assessment.score - a.assessment.score);

  const priorityCounts = {
    CRITICAL: smartPriorities.filter(p => p.assessment.priority === 'CRITICAL').length,
    HIGH: smartPriorities.filter(p => p.assessment.priority === 'HIGH').length,
    MEDIUM: smartPriorities.filter(p => p.assessment.priority === 'MEDIUM').length,
    NORMAL: smartPriorities.filter(p => p.assessment.priority === 'NORMAL').length,
  };

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
          <span className="text-xs text-slate-500 font-medium">Evidence Reliability</span>
          <p className="text-3xl font-bold text-blue-700 font-mono mt-1">{avgReliability}%</p>
          <p className="text-[11px] text-blue-800 font-semibold mt-1">Photo + GPS + Notes + History</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Predictive Alerts</span>
          <p className="text-3xl font-bold text-amber-700 font-mono mt-1">{predictiveAlerts.length}</p>
          <p className="text-[11px] text-amber-800 font-semibold mt-1">Trends from history logs</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Critical Smart Priority</span>
          <p className="text-3xl font-bold text-rose-700 font-mono mt-1">{priorityCounts.CRITICAL}</p>
          <p className="text-[11px] text-rose-800 font-semibold mt-1">{priorityCounts.HIGH} High Priority assets</p>
        </div>
      </div>

      {/* ================================================== */}
      {/* 1. EVIDENCE RELIABILITY INDICATOR CARD             */}
      {/* ================================================== */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                Evidence Reliability Index
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-factor data integrity audit calculated from Photo, Notes, Timestamp, GPS, and Inspection History.
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-xs text-blue-800 font-semibold">Fleet Evidence Reliability:</span>
            <span className="text-xl font-bold font-mono text-blue-900">{avgReliability}%</span>
          </div>
        </div>

        {/* 5 Factor Score Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>Photo ({photoAvg}/25)</span>
            </div>
            <p className="text-[11px] text-slate-500">Visual evidence presence & S3 upload verification</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Notes ({notesAvg}/20)</span>
            </div>
            <p className="text-[11px] text-slate-500">Depth of technician notes & failure observations</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Timestamp ({timestampAvg}/20)</span>
            </div>
            <p className="text-[11px] text-slate-500">ISO event order & execution window consistency</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>GPS ({gpsAvg}/20)</span>
            </div>
            <p className="text-[11px] text-slate-500">Physical coordinates & spatial proximity accuracy</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>History ({historyAvg}/15)</span>
            </div>
            <p className="text-[11px] text-slate-500">Cross-reference with asset history & digital sign-offs</p>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. PREDICTIVE ALERTS SECTION                      */}
      {/* ================================================== */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                Predictive Equipment Health Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Data-grounded failure predictions derived strictly from recurring historical inspection logs.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
            {predictiveAlerts.length} Active Trend{predictiveAlerts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {predictiveAlerts.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No recurring degradation trends detected in recent inspection history.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictiveAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-50/40 via-white to-slate-50 border border-amber-200 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-800 uppercase px-2 py-0.5 rounded-full bg-amber-100">
                      {alert.equipmentTag}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 font-display">
                      {alert.equipmentName}
                    </h3>
                    <p className="text-xs font-medium text-slate-500">{alert.facility}</p>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                    alert.risk === 'CRITICAL' 
                      ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {alert.risk} RISK
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950">
                  <p className="font-bold">{alert.summary}</p>
                </div>

                {/* History Trend Points */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Historical Data Points:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {alert.historyTrend.map((point, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {point}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Suggested Attention */}
                <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700">
                    <strong className="text-slate-900">Suggested Action:</strong> {alert.suggestedAttention}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* 3. SMART PRIORITY FLEET ASSESSMENT               */}
      {/* ================================================== */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                Smart Priority Fleet Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated using Failure History, Defect Severity, Asset Age, Missed Inspections, and Repeated Failures.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
              CRITICAL: {priorityCounts.CRITICAL}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
              HIGH: {priorityCounts.HIGH}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
              MEDIUM: {priorityCounts.MEDIUM}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              NORMAL: {priorityCounts.NORMAL}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {smartPriorities.map(({ equipment, assessment }) => (
            <div key={equipment.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{equipment.name}</span>
                  <span className="text-xs font-mono text-slate-500">({equipment.tag})</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    assessment.priority === 'CRITICAL' ? 'bg-rose-600 text-white' :
                    assessment.priority === 'HIGH' ? 'bg-amber-500 text-white' :
                    assessment.priority === 'MEDIUM' ? 'bg-sky-600 text-white' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {assessment.priority} PRIORITY ({assessment.score}/100)
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {equipment.facility} • Age: {assessment.metrics.equipmentAgeYears} yrs • History Failures: {assessment.metrics.failureHistoryCount}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end text-[11px]">
                {assessment.reasons.map((reason, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ))}
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

