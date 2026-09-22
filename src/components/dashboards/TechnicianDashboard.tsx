import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  WifiOff, 
  RefreshCw, 
  Plus, 
  ShieldAlert, 
  Layers, 
  Search, 
  PenTool, 
  CheckCircle, 
  Activity, 
  AlertCircle,
  QrCode,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';
import { StatusBadge } from '../common/StatusBadge';
import type { Inspection, RiskLevel } from '../../types';

interface TechnicianDashboardProps {
  onSelectInspection: (inspection: Inspection) => void;
  onOpenNewModal: () => void;
  onNavigate: (view: string) => void;
}

export const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({
  onSelectInspection,
  onOpenNewModal,
  onNavigate
}) => {
  const { currentUser } = useAuth();
  const { inspections, conflicts, equipments, auditLogs } = useInspections();
  const { isOnline, toggleSimulatedOffline, syncStatus, triggerManualSync } = useNetwork();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ASSIGNED' | 'COMPLETED' | 'PENDING' | 'CONFLICTS' | 'PENDING_SYNC' | 'CRITICAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to get equipment details
  const getEquipmentDetails = (equipmentId: string) => {
    return equipments.find(e => e.id === equipmentId);
  };

  // Base list of technician's inspections
  const myInspections = inspections.filter(
    i => i.assignedTechnicianId === currentUser?.id || i.technicianName.includes(currentUser?.name.split(' ')[0] || '')
  );

  // Metrics
  const assignedCount = myInspections.length;
  const completedCount = myInspections.filter(i => i.status === 'PASSED' || i.status === 'FAILED').length;
  const pendingCount = myInspections.filter(i => i.status === 'IN_PROGRESS' || i.status === 'PENDING_REVIEW' || i.status === 'DRAFT').length;
  const activeConflicts = conflicts.filter(c => c.status === 'ACTIVE');
  const conflictCount = myInspections.filter(i => i.status === 'CONFLICT').length + activeConflicts.length;
  const pendingSyncCount = myInspections.filter(i => i.syncState === 'PENDING' || i.offlineDraft).length;
  const criticalCount = myInspections.filter(i => i.riskLevel === 'CRITICAL' || i.defects.some(d => d.severity === 'CRITICAL')).length;

  // Filtered Inspections for the list
  const filteredInspections = myInspections.filter((insp) => {
    const matchesSearch = 
      insp.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.facility.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.zone.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'ASSIGNED':
        return true;
      case 'COMPLETED':
        return insp.status === 'PASSED' || insp.status === 'FAILED';
      case 'PENDING':
        return insp.status === 'IN_PROGRESS' || insp.status === 'PENDING_REVIEW' || insp.status === 'DRAFT';
      case 'CONFLICTS':
        return insp.status === 'CONFLICT' || activeConflicts.some(c => c.inspectionId === insp.id);
      case 'PENDING_SYNC':
        return insp.syncState === 'PENDING' || insp.offlineDraft;
      case 'CRITICAL':
        return insp.riskLevel === 'CRITICAL' || insp.defects.some(d => d.severity === 'CRITICAL');
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
  const needsAttentionItems = myInspections.filter(i => 
    i.riskLevel === 'CRITICAL' || 
    i.status === 'CONFLICT' || 
    i.status === 'FAILED' || 
    i.syncState === 'PENDING' || 
    i.offlineDraft
  ).slice(0, 5);

  // Recent activity logs (for technician)
  const recentLogs = auditLogs
    .filter(l => l.userName.includes(currentUser?.name.split(' ')[0] || '') || l.userRole === 'TECHNICIAN')
    .slice(0, 5);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Row: Welcome + Role + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display whitespace-nowrap">
              Good day, {currentUser?.name}
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
              Field Operations Technician • {currentUser?.badgeNumber}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Offline cache ready via Dexie IndexedDB. All field data persists locally and syncs automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-95 transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Start Inspection</span>
          </button>

          <button
            onClick={() => onNavigate('equipment')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>Equipment</span>
          </button>

          <button
            onClick={triggerManualSync}
            disabled={!isOnline || syncStatus === 'SYNCING'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
            title="Sync changes with server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* Offline Alert if offline */}
      {!isOnline && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong className="font-semibold text-amber-950">Offline Field Mode: </strong>
              All checklist responses, measurements, and photos are saved to local IndexedDB.
            </span>
          </div>
          <button
            onClick={toggleSimulatedOffline}
            className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-[11px] font-bold text-amber-950 whitespace-nowrap"
          >
            Go Online
          </button>
        </div>
      )}

      {/* 2. Compact KPI Section (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Assigned */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'ASSIGNED' ? 'ALL' : 'ASSIGNED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'ASSIGNED' ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Assigned</span>
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">{assignedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Work orders</p>
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
          <p className="text-[10px] text-slate-400 mt-0.5">Passed / Final</p>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'PENDING' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-700 font-mono">{pendingCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">In progress</p>
        </div>

        {/* Conflicts */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'CONFLICTS' ? 'ALL' : 'CONFLICTS')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'CONFLICTS' ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Conflicts</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${conflictCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xl font-bold font-mono ${conflictCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{conflictCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">CRDT diverged</p>
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
            <RefreshCw className={`w-3.5 h-3.5 ${pendingSyncCount > 0 ? 'text-sky-600' : 'text-slate-400'}`} />
          </div>
          <p className="text-xl font-bold text-sky-800 font-mono">{pendingSyncCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">In local DB</p>
        </div>

        {/* Critical Risk */}
        <div 
          onClick={() => setActiveFilter(activeFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'CRITICAL' ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Critical</span>
            <ShieldAlert className={`w-3.5 h-3.5 ${criticalCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xl font-bold font-mono ${criticalCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{criticalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">High severity</p>
        </div>
      </div>

      {/* 3. Main Content: 2-Column Layout (65% Left / 35% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: ~65% (lg:col-span-8) - Inspection Work Orders */}
        <div className="lg:col-span-8 space-y-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
            {/* Header + Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 font-display">
                  Inspection Work Orders
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredInspections.length} of {myInspections.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search equipment, tag..."
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

            {/* Table / List View */}
            {filteredInspections.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-1.5">
                <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No work orders match the selected filter.</p>
                <button
                  onClick={() => { setActiveFilter('ALL'); setSearchTerm(''); }}
                  className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-mono text-slate-400 border-b border-slate-100">
                      <th className="py-2 px-2 font-bold">ID / CODE</th>
                      <th className="py-2 px-2 font-bold">EQUIPMENT</th>
                      <th className="py-2 px-2 font-bold">STATUS</th>
                      <th className="py-2 px-2 font-bold">RISK</th>
                      <th className="py-2 px-2 font-bold">SYNC</th>
                      <th className="py-2 px-2 font-bold text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInspections.map((insp) => {
                      const eq = getEquipmentDetails(insp.equipmentId);
                      const isPendingSync = insp.syncState === 'PENDING' || insp.offlineDraft;

                      return (
                        <tr 
                          key={insp.id} 
                          onClick={() => onSelectInspection(insp)}
                          className="hover:bg-blue-50/50 transition cursor-pointer group"
                        >
                          <td className="py-2.5 px-2">
                            <span className="font-mono font-bold text-blue-700 group-hover:underline">
                              {insp.code}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {insp.id.slice(0, 8)}
                            </div>
                          </td>

                          <td className="py-2.5 px-2">
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 truncate max-w-[140px] sm:max-w-[180px]">
                              {insp.equipmentName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {eq?.tag || insp.equipmentId} • {insp.facility}
                            </div>
                          </td>

                          <td className="py-2.5 px-2">
                            <StatusBadge status={insp.status} size="sm" />
                          </td>

                          <td className="py-2.5 px-2">
                            {getPriorityBadge(insp.riskLevel)}
                          </td>

                          <td className="py-2.5 px-2">
                            {isPendingSync ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <RefreshCw className="w-2.5 h-2.5 text-amber-600" />
                                PENDING
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                SYNCED
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectInspection(insp);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                            >
                              {insp.status === 'DRAFT' || insp.status === 'IN_PROGRESS' ? 'Inspect' : 'Review'}
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

          {/* Quick Scanner & AI Diagnostic Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">QR Asset Scanner</p>
                  <p className="text-[10px] text-slate-500">Scan tag for instant audit form</p>
                </div>
              </div>
              <button
                onClick={onOpenNewModal}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-2xs hover:bg-blue-700 shrink-0 cursor-pointer"
              >
                Scan Tag
              </button>
            </div>

            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-200 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Gemini Field Diagnostic</p>
                  <p className="text-[10px] text-slate-600">Query ISO vibration or lockout safety</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('ai-assistant')}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 font-bold text-xs shadow-2xs shrink-0 cursor-pointer"
              >
                Ask AI
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ~35% (lg:col-span-4) - Needs Attention & Recent Activity */}
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
                <span>All inspections in compliance</span>
              </div>
            ) : (
              <div className="space-y-2">
                {needsAttentionItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectInspection(item)}
                    className="p-2.5 rounded-lg bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-200 transition cursor-pointer text-xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 group-hover:text-rose-700 truncate">
                        {item.equipmentName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {item.riskLevel === 'CRITICAL' ? '⚠️ Critical risk defect' : item.status === 'FAILED' ? '❌ Inspection failed' : item.syncState === 'PENDING' ? '⏳ Pending local sync' : 'Diverged conflict'}
                      </span>
                      <span className="text-blue-600 font-semibold group-hover:underline text-[10px]">
                        Open &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Recent Activity Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-wider">
                  Recent Activity
                </h3>
              </div>
              <button
                onClick={() => onNavigate('audit')}
                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                View Log
              </button>
            </div>

            <div className="space-y-2.5">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 font-medium truncate">
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
