import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Plus, 
  ChevronRight, 
  QrCode, 
  Sparkles, 
  ShieldAlert, 
  Layers,
  ArrowUpRight,
  Database,
  MapPin,
  Calendar,
  Search,
  Filter,
  Flame,
  PenTool,
  CheckCircle
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
  const { inspections, conflicts, equipments } = useInspections();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, syncStatus, triggerManualSync, unsyncedChangesCount } = useNetwork();

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

  // 1. Assigned Count
  const assignedCount = myInspections.length;

  // 2. Completed Count (PASSED or FAILED)
  const completedCount = myInspections.filter(
    i => i.status === 'PASSED' || i.status === 'FAILED'
  ).length;

  // 3. Pending Count (IN_PROGRESS, PENDING_REVIEW, DRAFT)
  const pendingCount = myInspections.filter(
    i => i.status === 'IN_PROGRESS' || i.status === 'PENDING_REVIEW' || i.status === 'DRAFT'
  ).length;

  // 4. Conflicts Count (CRDT conflicts or status CONFLICT)
  const activeConflicts = conflicts.filter(c => c.status === 'ACTIVE');
  const conflictInspectionsCount = myInspections.filter(i => i.status === 'CONFLICT').length + activeConflicts.length;

  // 5. Pending Sync Count (syncState === 'PENDING' or offlineDraft)
  const pendingSyncCount = myInspections.filter(
    i => i.syncState === 'PENDING' || i.offlineDraft
  ).length;

  // 6. Critical Inspections Count (riskLevel === 'CRITICAL' or critical defects)
  const criticalCount = myInspections.filter(
    i => i.riskLevel === 'CRITICAL' || i.defects.some(d => d.severity === 'CRITICAL')
  ).length;

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

  const getPriorityBadgeStyle = (priority: RiskLevel) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const formatInspectionTime = (dateStr: string, completedDate?: string) => {
    try {
      if (completedDate) {
        const d = new Date(completedDate);
        return `Completed: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      const d = new Date(dateStr);
      return `Scheduled: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white border border-blue-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
              FIELD TECHNICIAN WORKSPACE
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Badge: {currentUser?.badgeNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 tracking-tight font-display">
            Welcome back, {currentUser?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            All inspection forms and measurements are cached locally via <strong className="text-slate-900 font-semibold">Dexie IndexedDB</strong>. You can perform full mobile inspections without cell signal.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Inspection</span>
          </button>

          <button
            onClick={() => onNavigate('sync')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition"
            title="Inspect Dexie.js local storage"
          >
            <Database className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Offline DB</span>
          </button>
        </div>
      </div>

      {/* Offline Status Alert if offline */}
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-950">Offline Field Mode Active: </span>
              All checklist updates, tolerances, and defect photos will save directly into browser IndexedDB storage and sync automatically once connectivity is restored.
            </div>
          </div>
          <button
            onClick={toggleSimulatedOffline}
            className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-[11px] font-semibold text-amber-950 whitespace-nowrap transition"
          >
            Go Online
          </button>
        </div>
      )}

      {/* ATTRACTIVE CARDS (Assigned, Completed, Pending, Conflicts, Pending Sync, Critical) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
            Inspection Performance Metrics
          </h2>
          <span className="text-[11px] text-slate-400">
            Tap any card to filter list
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. ASSIGNED CARD */}
          <div 
            onClick={() => setActiveFilter(activeFilter === 'ASSIGNED' ? 'ALL' : 'ASSIGNED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs group ${
              activeFilter === 'ASSIGNED' 
                ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-200' 
                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold text-slate-700">Assigned</span>
              <ClipboardCheck className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tracking-tight">
              {assignedCount}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>Work orders</span>
              {activeFilter === 'ASSIGNED' && (
                <span className="text-[10px] font-bold text-blue-600 font-mono">FILTERED</span>
              )}
            </div>
          </div>

          {/* 2. COMPLETED CARD */}
          <div 
            onClick={() => setActiveFilter(activeFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs group ${
              activeFilter === 'COMPLETED' 
                ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-200' 
                : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold text-slate-700">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono tracking-tight">
              {completedCount}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>Passed / Final</span>
              {activeFilter === 'COMPLETED' && (
                <span className="text-[10px] font-bold text-emerald-600 font-mono">FILTERED</span>
              )}
            </div>
          </div>

          {/* 3. PENDING CARD */}
          <div 
            onClick={() => setActiveFilter(activeFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs group ${
              activeFilter === 'PENDING' 
                ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-200' 
                : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold text-slate-700">Pending</span>
              <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-amber-700 font-mono tracking-tight">
              {pendingCount}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>In progress</span>
              {activeFilter === 'PENDING' && (
                <span className="text-[10px] font-bold text-amber-600 font-mono">FILTERED</span>
              )}
            </div>
          </div>

          {/* 4. CONFLICTS CARD */}
          <div 
            onClick={() => setActiveFilter(activeFilter === 'CONFLICTS' ? 'ALL' : 'CONFLICTS')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs group ${
              activeFilter === 'CONFLICTS' 
                ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200' 
                : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold text-slate-700">Conflicts</span>
              <AlertTriangle className={`w-4 h-4 ${conflictInspectionsCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
            </div>
            <p className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${conflictInspectionsCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {conflictInspectionsCount}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>CRDT diverged</span>
              {activeFilter === 'CONFLICTS' && (
                <span className="text-[10px] font-bold text-rose-600 font-mono">FILTERED</span>
              )}
            </div>
          </div>

          {/* 5. PENDING SYNC CARD */}
          <div 
            onClick={() => setActiveFilter(activeFilter === 'PENDING_SYNC' ? 'ALL' : 'PENDING_SYNC')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs group ${
              activeFilter === 'PENDING_SYNC' 
                ? 'bg-sky-50/80 border-sky-400 ring-2 ring-sky-200' 
                : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold text-slate-700">Pending Sync</span>
              <RefreshCw className={`w-4 h-4 ${pendingSyncCount > 0 ? 'text-sky-600' : 'text-slate-400'}`} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-sky-800 font-mono tracking-tight">
              {pendingSyncCount}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>In IndexedDB</span>
              {activeFilter === 'PENDING_SYNC' && (
                <span className="text-[10px] font-bold text-sky-600 font-mono">FILTERED</span>
              )}
            </div>
          </div>

          {/* 6. CRITICAL INSPECTIONS CARD */}
          <div 
            onClick={() => setActiveFilter(activeFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs group ${
              activeFilter === 'CRITICAL' 
                ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-200' 
                : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold text-slate-700">Critical</span>
              <ShieldAlert className={`w-4 h-4 ${criticalCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${criticalCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {criticalCount}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>Severe risk</span>
              {activeFilter === 'CRITICAL' && (
                <span className="text-[10px] font-bold text-rose-600 font-mono">FILTERED</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* INSPECTION LIST (Each card shows Equipment name, ID, Location, Time, Priority, Status, Sync status) */}
      <div className="space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-display">
              Field Work Orders & Inspection Roster
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-200">
              {filteredInspections.length} of {myInspections.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search equipment, tag, zone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
              />
            </div>

            {/* Clear Filter if active */}
            {activeFilter !== 'ALL' && (
              <button
                onClick={() => setActiveFilter('ALL')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold whitespace-nowrap transition"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Inspection List Cards */}
        {filteredInspections.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No inspections match current criteria.</p>
            <p className="text-xs text-slate-400">Try changing your search terms or resetting the filter card selection.</p>
            <button
              onClick={() => { setActiveFilter('ALL'); setSearchTerm(''); }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInspections.map((insp) => {
              const eq = getEquipmentDetails(insp.equipmentId);
              const equipmentIdDisplay = eq?.tag || insp.equipmentId;
              const locationDisplay = `${insp.facility} • ${insp.zone}`;
              const timeDisplay = formatInspectionTime(insp.scheduledDate, insp.completedDate);
              const priority = insp.riskLevel;

              return (
                <div
                  key={insp.id}
                  onClick={() => onSelectInspection(insp)}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer shadow-2xs flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Card Top Row: Equipment Name & Status Pills */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex-1 min-w-0">
                        {/* 1. Equipment Name */}
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition truncate font-display">
                          {insp.equipmentName}
                        </h3>
                        {/* 2. Equipment ID */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            ID: {equipmentIdDisplay}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] font-mono text-blue-600 font-semibold">
                            {insp.code}
                          </span>
                        </div>
                      </div>

                      {/* 5. Priority Badge */}
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase shrink-0 border ${getPriorityBadgeStyle(priority)}`}>
                        {priority}
                      </span>
                    </div>

                    {/* Inspection Metadata: 3. Location & 4. Inspection Time */}
                    <div className="space-y-1.5 py-2.5 border-t border-slate-100 text-xs text-slate-600">
                      {/* 3. Location */}
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate font-medium">{locationDisplay}</span>
                      </div>

                      {/* 4. Inspection Time */}
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px]">{timeDisplay}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Row: 6. Status, 7. Sync Status & Action CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 6. Status */}
                      <StatusBadge status={insp.status} size="sm" />

                      {/* 7. Sync Status */}
                      <StatusBadge status={insp.syncState} size="sm" />
                    </div>

                    {/* Launch Inspection CTA */}
                    <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform shrink-0">
                      <span>Inspect</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Field Inspection Bottom Tool Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* QR Scanner Tool */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">QR Asset Scanner</p>
              <p className="text-[11px] text-slate-500">Scan equipment barcode to jump directly into audit form</p>
            </div>
          </div>
          <button
            onClick={onOpenNewModal}
            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-2xs hover:bg-blue-700 shrink-0"
          >
            Scan Tag
          </button>
        </div>

        {/* AI Field Assistant Quick Prompt */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-200 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Gemini Field Diagnostic</p>
              <p className="text-[11px] text-slate-600">Query ISO vibration limits or safety lockout guidelines</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('ai-assistant')}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 font-bold text-xs shadow-2xs shrink-0"
          >
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
};
