import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Search, 
  Plus, 
  RefreshCw, 
  Layers, 
  GitFork, 
  AlertCircle, 
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';
import { StatusBadge } from '../common/StatusBadge';
import type { Inspection, RiskLevel } from '../../types';

interface SupervisorDashboardProps {
  onSelectInspection: (inspection: Inspection) => void;
  onNavigate: (view: string) => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  onSelectInspection,
  onNavigate
}) => {
  const { currentUser } = useAuth();
  const { inspections, conflicts, auditLogs, equipments } = useInspections();
  const { isOnline, syncStatus, triggerManualSync, unsyncedChangesCount } = useNetwork();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'COMPLETED' | 'CONFLICTS' | 'CRITICAL' | 'PENDING_SYNC'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to get equipment details
  const getEquipmentDetails = (equipmentId: string) => {
    return equipments.find(e => e.id === equipmentId);
  };

  // Supervisor Metrics
  const totalCount = inspections.length;
  const pendingReview = inspections.filter(i => i.status === 'PENDING_REVIEW');
  const completedCount = inspections.filter(i => i.status === 'PASSED' || i.status === 'FAILED').length;
  const activeConflicts = conflicts.filter(c => c.status === 'ACTIVE');
  const criticalRisks = inspections.filter(i => i.riskLevel === 'CRITICAL' || i.riskLevel === 'HIGH');
  const pendingSyncCount = inspections.filter(i => i.syncState === 'PENDING' || i.offlineDraft).length;

  // Filtered Inspections for table
  const filteredInspections = inspections.filter((insp) => {
    const matchesSearch = 
      insp.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.facility.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.zone.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'PENDING_REVIEW':
        return insp.status === 'PENDING_REVIEW';
      case 'COMPLETED':
        return insp.status === 'PASSED' || insp.status === 'FAILED';
      case 'CONFLICTS':
        return insp.status === 'CONFLICT' || activeConflicts.some(c => c.inspectionId === insp.id);
      case 'CRITICAL':
        return insp.riskLevel === 'CRITICAL' || insp.riskLevel === 'HIGH';
      case 'PENDING_SYNC':
        return insp.syncState === 'PENDING' || insp.offlineDraft;
      default:
        return true;
    }
  });

  const getPriorityBadge = (priority: RiskLevel) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-100 text-orange-800 border border-orange-300">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">LOW</span>;
    }
  };

  // Needs Attention items
  const needsAttentionItems = [
    ...activeConflicts.map(c => ({
      id: c.id,
      title: `CRDT Conflict: ${c.field} in ${c.inspectionCode}`,
      subtitle: `Concurrent edits: ${c.localUser || 'Local Tech'} vs ${c.remoteUser || 'Remote Peer'}`,
      type: 'CONFLICT' as const,
      inspectionId: c.inspectionId
    })),
    ...criticalRisks.slice(0, 3).map(r => ({
      id: r.id,
      title: `Critical Risk: ${r.equipmentName}`,
      subtitle: `${r.facility} • Assigned: ${r.technicianName}`,
      type: 'RISK' as const,
      inspectionId: r.id
    })),
    ...pendingReview.slice(0, 3).map(p => ({
      id: p.id,
      title: `Pending Sign-off: ${p.equipmentName}`,
      subtitle: `Submitted by ${p.technicianName} • ${p.code}`,
      type: 'REVIEW' as const,
      inspectionId: p.id
    }))
  ].slice(0, 6);

  const recentLogs = auditLogs.slice(0, 5);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Row: Welcome + Role + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display whitespace-nowrap">
              Good day, {currentUser?.name}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
              Operations Supervisor • {currentUser?.badgeNumber}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Team quality oversight, divergence resolution, and field safety compliance verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('conflicts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer whitespace-nowrap ${
              activeConflicts.length > 0 
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-rose-600" />
            <span>Review Conflicts ({activeConflicts.length})</span>
          </button>

          <button
            onClick={() => onNavigate('analytics')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Analytics</span>
          </button>

          <button
            onClick={triggerManualSync}
            disabled={!isOnline || syncStatus === 'SYNCING'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* 2. Compact KPI Section (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total Inspections */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'ALL' ? 'ALL' : 'ALL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'ALL' ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Total</span>
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">{totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Across all zones</p>
        </div>

        {/* Pending Review */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'PENDING_REVIEW' ? 'ALL' : 'PENDING_REVIEW')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'PENDING_REVIEW' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Pending Review</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-700 font-mono">{pendingReview.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Needs sign-off</p>
        </div>

        {/* Completed */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'COMPLETED' ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-700 font-mono">{completedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Passed & Failed</p>
        </div>

        {/* Active Conflicts */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'CONFLICTS' ? 'ALL' : 'CONFLICTS')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'CONFLICTS' ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Conflicts</span>
            <GitFork className={`w-3.5 h-3.5 ${activeConflicts.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xl font-bold font-mono ${activeConflicts.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{activeConflicts.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">CRDT diverged</p>
        </div>

        {/* Critical Risks */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'CRITICAL' ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">High Risks</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className={`text-xl font-bold font-mono ${criticalRisks.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{criticalRisks.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Defects logged</p>
        </div>

        {/* Pending Sync */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'PENDING_SYNC' ? 'ALL' : 'PENDING_SYNC')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'PENDING_SYNC' ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Pending Sync</span>
            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <p className="text-xl font-bold text-sky-800 font-mono">{pendingSyncCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Queued changes</p>
        </div>
      </div>

      {/* 3. Main Content: 2-Column Desktop Layout (65% Left / 35% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: ~65% (lg:col-span-8) - Inspection Monitoring Table */}
        <div className="lg:col-span-8 space-y-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            {/* Header + Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 font-display">
                  Team Inspection Monitoring
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredInspections.length} of {inspections.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search technician, equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {activeFilter !== 'ALL' && (
                  <button
                    onClick={() => setActiveFilter('ALL')}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Table View */}
            {filteredInspections.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-1.5">
                <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No inspections match filter criteria.</p>
                <button
                  onClick={() => { setActiveFilter('ALL'); setSearchTerm(''); }}
                  className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-mono text-slate-400 border-b border-slate-100">
                      <th className="py-2 px-2 font-bold">ID / CODE</th>
                      <th className="py-2 px-2 font-bold">EQUIPMENT</th>
                      <th className="py-2 px-2 font-bold">TECHNICIAN</th>
                      <th className="py-2 px-2 font-bold">STATUS</th>
                      <th className="py-2 px-2 font-bold">RISK</th>
                      <th className="py-2 px-2 font-bold text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInspections.map((insp) => {
                      const eq = getEquipmentDetails(insp.equipmentId);

                      return (
                        <tr 
                          key={insp.id} 
                          onClick={() => onSelectInspection(insp)}
                          className="hover:bg-indigo-50/40 transition cursor-pointer group"
                        >
                          <td className="py-2.5 px-2">
                            <span className="font-mono font-bold text-blue-700 group-hover:underline">
                              {insp.code}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {insp.facility}
                            </div>
                          </td>

                          <td className="py-2.5 px-2">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 truncate max-w-[130px] sm:max-w-[170px]">
                              {insp.equipmentName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {eq?.tag || insp.equipmentId}
                            </div>
                          </td>

                          <td className="py-2.5 px-2">
                            <span className="font-medium text-slate-700">
                              {insp.technicianName}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {insp.zone}
                            </div>
                          </td>

                          <td className="py-2.5 px-2">
                            <StatusBadge status={insp.status} size="sm" />
                          </td>

                          <td className="py-2.5 px-2">
                            {getPriorityBadge(insp.riskLevel)}
                          </td>

                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectInspection(insp);
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition shadow-2xs cursor-pointer ${
                                insp.status === 'PENDING_REVIEW'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700'
                              }`}
                            >
                              {insp.status === 'PENDING_REVIEW' ? 'Sign-Off' : 'Review'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ~35% (lg:col-span-4) - Needs Attention & Team Activity */}
        <div className="lg:col-span-4 space-y-3">
          {/* 1. Needs Attention Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-wider">
                  Needs Attention
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                {needsAttentionItems.length}
              </span>
            </div>

            {needsAttentionItems.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <span>All inspections up-to-date and resolved</span>
              </div>
            ) : (
              <div className="space-y-2">
                {needsAttentionItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.type === 'CONFLICT') {
                        onNavigate('conflicts');
                      } else {
                        const target = inspections.find(i => i.id === item.inspectionId);
                        if (target) onSelectInspection(target);
                      }
                    }}
                    className="p-2.5 rounded-lg bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-200 transition cursor-pointer text-xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 group-hover:text-rose-700 truncate">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600">
                        {item.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Team Activity Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-wider">
                  Team Activity
                </h3>
              </div>
              <button
                onClick={() => onNavigate('audit')}
                className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Full Ledger
              </button>
            </div>

            <div className="space-y-2.5">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 font-medium truncate">
                      <span className="font-bold">{log.userName}: </span>
                      {log.action}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
