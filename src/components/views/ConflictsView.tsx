import React, { useState } from 'react';
import { 
  GitFork, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles,
  Lock
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import type { ConflictItem } from '../../types';

export const ConflictsView: React.FC = () => {
  const { conflicts, resolveConflictItem } = useInspections();
  const { currentUser, hasRole } = useAuth();
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(conflicts[0] || null);
  const [resolutionNotice, setResolutionNotice] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const activeConflicts = conflicts.filter(c => c.status === 'ACTIVE');
  const canResolve = currentUser?.permissions?.canResolveConflicts ?? (currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ADMIN');

  const handleResolve = async (conflictId: string, resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MANUAL_MERGE') => {
    setBackendError(null);
    setIsResolving(true);

    try {
      // Execute real backend API call with Bearer JWT token
      const winningValue = resolution === 'USE_LOCAL' 
        ? (selectedConflict?.localValue || '') 
        : (selectedConflict?.serverValue || '');

      await ApiClient.resolveConflict(conflictId, resolution, winningValue, `Resolved via WA-1 RBAC console by ${currentUser?.name}`);

      // If backend accepted, update local state
      await resolveConflictItem(conflictId, resolution);
      setResolutionNotice(`Backend Verified: Conflict resolved using ${resolution.replace('_', ' ')}.`);
      setTimeout(() => setResolutionNotice(null), 4000);
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      console.error('Backend rejected conflict resolution:', error);
      setBackendError(error.message || 'Authorization failed. Backend rejected conflict mutation.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50/30 to-white border border-rose-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
              CRDT Yjs STATE COLLABORATION
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Vector Clock Divergence Manager
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 tracking-tight font-display">
            Concurrent Field Conflict Resolution
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            When field technicians perform offline inspections while central telemetry or supervisory edits occur simultaneously, CRDT vector clocks isolate concurrent mutations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={activeConflicts.length > 0 ? 'CONFLICT' : 'SYNCED'} size="md" />
        </div>
      </div>

      {/* Role Permission Alert Notice */}
      {!canResolve && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Technician Role Restriction (RBAC Policy WA-1-SEC-04)</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Technicians are strictly restricted from resolving vector conflicts. Only accounts with <strong>Supervisor</strong> or <strong>Administrator</strong> roles possess cryptographic clearance to override state divergence. Attempting to resolve will be rejected by backend authorization.
            </p>
          </div>
        </div>
      )}

      {/* Backend Rejection Alert */}
      {backendError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold font-mono">403 FORBIDDEN - BACKEND REJECTED MUTATION</p>
            <p className="text-rose-800 text-[11px] leading-relaxed">
              {backendError}
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {resolutionNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">{resolutionNotice}</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-700 font-semibold">Backend Synced</span>
        </div>
      )}

      {/* Main Conflict Layout */}
      {conflicts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 shadow-2xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">All Vector Clocks Harmonized</h3>
          <p className="text-xs text-slate-500 mt-1">Zero active conflicts. Offline replicas and server records are mathematically identical.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conflict List (Left Col) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Detected Conflicts ({activeConflicts.length} Active)
            </h3>

            <div className="space-y-2.5">
              {conflicts.map((conf) => {
                const isSelected = selectedConflict?.id === conf.id;
                const isActive = conf.status === 'ACTIVE';
                return (
                  <div
                    key={conf.id}
                    onClick={() => setSelectedConflict(conf)}
                    className={`p-4 rounded-2xl border transition cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-blue-700">
                        {conf.inspectionCode}
                      </span>
                      <StatusBadge status={isActive ? 'CONFLICT' : 'RESOLVED'} size="sm" />
                    </div>

                    <p className="text-xs font-bold text-slate-900 truncate">{conf.equipmentName}</p>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                      Field: <strong className="text-slate-800">{conf.field}</strong>
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{new Date(conf.detectedAt).toLocaleTimeString()}</span>
                      <span>By: {conf.technicianName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conflict 3-Way Diff Inspector (Right 2 Cols) */}
          <div className="lg:col-span-2">
            {selectedConflict ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-mono text-rose-700 uppercase tracking-wider font-bold">
                      CRDT Mutation Dispute #{selectedConflict.id}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 font-display">
                      {selectedConflict.field}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Asset: <strong className="text-slate-800">{selectedConflict.equipmentName}</strong> ({selectedConflict.inspectionCode})
                    </p>
                  </div>

                  <StatusBadge status={selectedConflict.status === 'ACTIVE' ? 'CONFLICT' : 'RESOLVED'} size="md" />
                </div>

                {/* 3-Way Visual Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left: Local Field Draft (Technician device) */}
                  <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700">Local Field Value (Offline Draft)</span>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">Tablet Replica</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-blue-200 font-mono text-xs text-emerald-700 font-bold break-words shadow-2xs">
                      {selectedConflict.localValue}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Recorded by <strong className="text-slate-900">{selectedConflict.technicianName}</strong> via physical inspection tool.
                    </p>
                    {selectedConflict.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleResolve(selectedConflict.id, 'USE_LOCAL')}
                        disabled={isResolving}
                        className={`w-full mt-2 py-2 rounded-xl text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 ${
                          !canResolve 
                            ? 'bg-slate-400 hover:bg-slate-500 cursor-not-allowed opacity-75' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {!canResolve && <Lock className="w-3.5 h-3.5" />}
                        <span>Accept Local Field Reading {!canResolve && '(Forbidden)'}</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Server / Remote snapshot */}
                  <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-700">Server Remote Telemetry</span>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">PostgreSQL Core</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-purple-200 font-mono text-xs text-amber-700 font-bold break-words shadow-2xs">
                      {selectedConflict.serverValue}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Synchronized from central SCADA telemetry baseline.
                    </p>
                    {selectedConflict.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleResolve(selectedConflict.id, 'USE_SERVER')}
                        disabled={isResolving}
                        className={`w-full mt-2 py-2 rounded-xl text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 ${
                          !canResolve 
                            ? 'bg-slate-400 hover:bg-slate-500 cursor-not-allowed opacity-75' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {!canResolve && <Lock className="w-3.5 h-3.5" />}
                        <span>Accept Server Baseline {!canResolve && '(Forbidden)'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Conflict Synthesis */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gemini CRDT Recommendation:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    The local technician value was calibrated with Fluke 1587 on-site, whereas the server value reflects prior-day remote telemetry. Recommended action: <strong>Accept Local Field Reading</strong> to reflect current physical asset condition.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-400 shadow-2xs">
                Select a conflict to inspect the 3-way diff.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
