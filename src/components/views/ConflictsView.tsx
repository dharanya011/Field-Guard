import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles,
  Lock,
  User,
  Clock,
  MapPin,
  FileText,
  Camera,
  Hash,
  ArrowDown,
  Edit3,
  X,
  Check,
  Shield,
  RefreshCw,
  GitFork,
  Zap
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { ApiClient } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import type { ConflictItem, EvidencePhoto, InspectionGpsLocation } from '../../types';

export const ConflictsView: React.FC = () => {
  const { conflicts, resolveConflictItem } = useInspections();
  const { currentUser } = useAuth();
  const { isOnline, syncStatus, triggerManualSync } = useNetwork();
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(conflicts[0] || null);
  const [resolutionNotice, setResolutionNotice] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Manual Resolution Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualValueInput, setManualValueInput] = useState('');
  const [manualNotesInput, setManualNotesInput] = useState('');

  // AI Conflict Assistant State
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiStatusText, setAiStatusText] = useState<'GEMINI AI — ONLINE' | 'LOCAL AI — OFFLINE' | 'GEMINI NOT CONFIGURED'>('LOCAL AI — OFFLINE');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const activeConflicts = conflicts.filter(c => c.status === 'ACTIVE');
  const canResolve = currentUser?.permissions?.canResolveConflicts ?? (currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ADMIN');

  React.useEffect(() => {
    if (!selectedConflict) return;

    const fetchAiAnalysis = async () => {
      setIsLoadingAi(true);
      try {
        const res = await ApiClient.analyzeConflictWithAi(selectedConflict);
        if (res.geminiConfigured) {
          setAiStatusText('GEMINI AI — ONLINE');
          setAiSuggestion(res.suggestion);
        } else {
          setAiStatusText('GEMINI NOT CONFIGURED');
          setAiSuggestion(`GEMINI NOT CONFIGURED: Unable to invoke Gemini API without process.env.GEMINI_API_KEY. AI Suggestion: Technician A recorded physical defect (${selectedConflict.localValue}) vs Technician B remote entry (${selectedConflict.serverValue}). Supervisor manual physical inspection recommended.`);
        }
      } catch {
        setAiStatusText('LOCAL AI — OFFLINE');
        setAiSuggestion(`LOCAL AI — OFFLINE: Local Rule Evaluation: Technician A (${selectedConflict.localUser || 'Technician A'}) registered a physical defect observation (${selectedConflict.localValue}). Technician B (${selectedConflict.remoteUser || 'Technician B'}) submitted ${selectedConflict.serverValue}. Supervisor review recommended.`);
      } finally {
        setIsLoadingAi(false);
      }
    };

    fetchAiAnalysis();
  }, [selectedConflict]);

  const handleResolve = async (
    conflictId: string, 
    resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MANUAL_MERGE',
    customVal?: string,
    customNotes?: string
  ) => {
    setBackendError(null);
    setIsResolving(true);

    try {
      const winningValue = resolution === 'USE_LOCAL' 
        ? (selectedConflict?.localValue || '') 
        : resolution === 'USE_SERVER'
          ? (selectedConflict?.serverValue || '')
          : (customVal || manualValueInput || 'Manual Supervisor Override');

      const auditReason = customNotes || manualNotesInput || `Resolved via WA-1 Supervisor Console by ${currentUser?.name || 'System Supervisor'}`;

      await ApiClient.resolveConflict(conflictId, resolution, winningValue, auditReason);

      await resolveConflictItem(conflictId, resolution, winningValue, auditReason);
      
      setResolutionNotice(`Supervisor Decision Recorded: Conflict resolved using ${resolution.replace('_', ' ')}.`);
      setShowManualModal(false);
      setManualValueInput('');
      setManualNotesInput('');
      setTimeout(() => setResolutionNotice(null), 4000);
    } catch (err: unknown) {
      const error = err as Error & { code?: string };
      console.error('Backend rejected conflict resolution:', error);
      setBackendError(error.message || 'Authorization failed. Backend rejected conflict mutation.');
    } finally {
      setIsResolving(false);
    }
  };

  const openManualResolution = () => {
    if (!selectedConflict) return;
    setManualValueInput(selectedConflict.localValue || selectedConflict.serverValue || '');
    setManualNotesInput(`Supervisor override by ${currentUser?.name} on ${new Date().toLocaleDateString()}`);
    setShowManualModal(true);
  };

  const handleAutoResolveNonConflicting = async () => {
    if (!selectedConflict) return;
    await handleResolve(selectedConflict.id, 'USE_LOCAL', selectedConflict.localValue, 'Auto-resolved safe non-conflicting field entry');
  };

  const renderEvidencePhotos = (evidence?: EvidencePhoto[] | string) => {
    if (!evidence) return null;
    if (typeof evidence === 'string') {
      return (
        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{evidence}</span>
        </div>
      );
    }
    if (Array.isArray(evidence) && evidence.length > 0) {
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {evidence.map((ev, idx) => (
            <div key={ev.id || idx} className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] flex items-center gap-2">
              {ev.url && ev.url.startsWith('http') ? (
                <img src={ev.url} alt="Evidence photo" className="w-8 h-8 rounded-lg object-cover border border-slate-300 shrink-0" />
              ) : (
                <Camera className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800 text-[11px] leading-tight truncate max-w-[140px]">
                  {ev.caption || ev.description || 'Photo Evidence'}
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Recorded'}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderGps = (gps?: InspectionGpsLocation | string) => {
    if (!gps) return null;
    if (typeof gps === 'string') {
      return <span className="font-mono text-[11px] text-slate-700">{gps}</span>;
    }
    return (
      <span className="font-mono text-[11px] text-slate-700">
        {gps.latitude?.toFixed(4)}, {gps.longitude?.toFixed(4)} ({gps.address || 'Field Sector Location'})
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Row: Title & Subtitle on left, Action Buttons on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Field Conflict Resolution Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            When field technicians enter contradicting evaluations or offline replicas diverge, supervisor authoritative merge ensures zero data loss.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => handleAutoResolveNonConflicting()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-95 transition cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Auto-Resolve Safe</span>
          </button>

          <button
            onClick={triggerManualSync}
            disabled={!isOnline || syncStatus === 'SYNCING'}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Synchronize peer updates"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>Sync Peer Updates</span>
          </button>
        </div>
      </div>

      {/* Role Permission Alert Notice */}
      {!canResolve && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Supervisor Authority Policy (WA-1-SEC-04)</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Technicians are strictly restricted from resolving field conflict items. Only accounts with <strong>Supervisor</strong> or <strong>Administrator</strong> roles possess clearance to sign off on conflict resolution.
            </p>
          </div>
        </div>
      )}

      {/* Backend Rejection Alert */}
      {backendError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold font-mono">403 FORBIDDEN - MUTATION REJECTED</p>
            <p className="text-rose-800 text-[11px] leading-relaxed">{backendError}</p>
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
          <span className="font-mono text-[10px] text-emerald-700 font-semibold">Audit Entry Saved</span>
        </div>
      )}

      {/* Main Conflict Layout */}
      {conflicts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 shadow-2xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Zero Active Conflicts</h3>
          <p className="text-xs text-slate-500 mt-1">All offline field replicas and remote server records are synchronized.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Conflict Selection List (Left Col) */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Disputed Items ({activeConflicts.length} Active)
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
                        ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/10'
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
                      <span>By: {conf.localUser || conf.technicianName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supervisor Center Main Inspection Area (Right 3 Cols) */}
          <div className="lg:col-span-3">
            {selectedConflict ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                {/* Item Banner Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {selectedConflict.conflictType === 'SEMANTIC_BUSINESS_CONFLICT' ? 'Semantic Business Conflict' : 'CRDT Divergence'} #{selectedConflict.id}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">OpID: {selectedConflict.localOperationId || 'N/A'}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-display">
                      {selectedConflict.field}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Equipment: <strong className="text-slate-900">{selectedConflict.equipmentName}</strong> ({selectedConflict.inspectionCode})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedConflict.status === 'ACTIVE' ? 'CONFLICT' : 'RESOLVED'} size="md" />
                  </div>
                </div>

                {/* ========================================================== */}
                {/* DESKTOP LAYOUT (sm:grid 3-cols: TECHNICIAN A | CONFLICT | TECHNICIAN B) */}
                {/* ========================================================== */}
                <div className="hidden sm:block space-y-6">
                  {/* Desktop 3-Column Header Bar */}
                  <div className="grid grid-cols-7 gap-3 text-center text-xs font-mono font-bold uppercase tracking-wider py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="col-span-3 text-blue-700 flex items-center justify-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>TECHNICIAN A</span>
                    </div>
                    <div className="col-span-1 text-rose-700 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>CONFLICT</span>
                    </div>
                    <div className="col-span-3 text-purple-700 flex items-center justify-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-600" />
                      <span>TECHNICIAN B</span>
                    </div>
                  </div>

                  {/* Desktop Side-by-Side Entries */}
                  <div className="grid grid-cols-7 gap-3 items-stretch">
                    {/* TECHNICIAN A Column (Left 3 cols) */}
                    <div className="col-span-3 p-4 rounded-2xl bg-blue-50/40 border border-blue-200 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                          <span className="text-xs font-bold text-blue-900 font-mono">
                            {selectedConflict.localUser || selectedConflict.technicianName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800">
                            Local Entry
                          </span>
                        </div>

                        {/* Evaluated Value */}
                        <div className="mt-2.5 p-3 rounded-xl bg-white border border-blue-200 font-mono text-xs text-rose-700 font-bold break-words shadow-2xs">
                          {selectedConflict.localValue}
                        </div>

                        {/* Details */}
                        <div className="space-y-2 text-xs text-slate-700 pt-3">
                          <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{selectedConflict.localTimestamp ? new Date(selectedConflict.localTimestamp).toLocaleString() : 'Recent'}</span>
                          </div>

                          <div className="flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <span className="text-slate-700 italic text-[11px]">"{selectedConflict.localNotes || 'No local notes provided'}"</span>
                          </div>

                          {selectedConflict.localGps && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              {renderGps(selectedConflict.localGps)}
                            </div>
                          )}

                          {selectedConflict.localOperationId && (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 pt-1.5 border-t border-blue-100">
                              <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">OpID: {selectedConflict.localOperationId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Photo Evidence A */}
                      {selectedConflict.localEvidence && (
                        <div className="pt-2 border-t border-blue-100">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                            <Camera className="w-3 h-3 text-blue-600" /> Photo Evidence A:
                          </span>
                          {renderEvidencePhotos(selectedConflict.localEvidence)}
                        </div>
                      )}
                    </div>

                    {/* CONFLICT Divider Badge Column (Center 1 col) */}
                    <div className="col-span-1 flex flex-col items-center justify-center p-2 rounded-xl bg-rose-50/50 border border-rose-200/80 text-center space-y-2">
                      <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 font-bold font-mono text-xs">
                        VS
                      </div>
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-tight font-mono">
                        Divergent State
                      </span>
                    </div>

                    {/* TECHNICIAN B Column (Right 3 cols) */}
                    <div className="col-span-3 p-4 rounded-2xl bg-purple-50/40 border border-purple-200 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                          <span className="text-xs font-bold text-purple-900 font-mono">
                            {selectedConflict.remoteUser || selectedConflict.supervisorName || 'Technician B'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-100 text-purple-800">
                            Remote Entry
                          </span>
                        </div>

                        {/* Evaluated Value */}
                        <div className="mt-2.5 p-3 rounded-xl bg-white border border-purple-200 font-mono text-xs text-emerald-700 font-bold break-words shadow-2xs">
                          {selectedConflict.serverValue}
                        </div>

                        {/* Details */}
                        <div className="space-y-2 text-xs text-slate-700 pt-3">
                          <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>{selectedConflict.remoteTimestamp ? new Date(selectedConflict.remoteTimestamp).toLocaleString() : 'Recent'}</span>
                          </div>

                          <div className="flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <span className="text-slate-700 italic text-[11px]">"{selectedConflict.remoteNotes || 'No remote notes provided'}"</span>
                          </div>

                          {selectedConflict.remoteGps && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              {renderGps(selectedConflict.remoteGps)}
                            </div>
                          )}

                          {selectedConflict.remoteOperationId && (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 pt-1.5 border-t border-purple-100">
                              <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">OpID: {selectedConflict.remoteOperationId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Photo Evidence B */}
                      {selectedConflict.remoteEvidence && (
                        <div className="pt-2 border-t border-purple-100">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                            <Camera className="w-3 h-3 text-purple-600" /> Photo Evidence B:
                          </span>
                          {renderEvidencePhotos(selectedConflict.remoteEvidence)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Suggestion Area (Desktop) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white border border-indigo-200 space-y-2 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold font-display">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>AI Conflict Assistant Recommendation:</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                        aiStatusText === 'GEMINI AI — ONLINE'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : aiStatusText === 'LOCAL AI — OFFLINE'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}>
                        {aiStatusText}
                      </span>
                    </div>

                    <p className="text-slate-800 leading-relaxed text-[12px] font-medium">
                      {isLoadingAi ? 'Analyzing technician notes, photos, timestamps, and evidence...' : (aiSuggestion || 'AI Suggestion: Technician A recorded physical defect observation. Supervisor manual review recommended.')}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono italic">
                      * AI provides a suggestion only. AI does not automatically resolve conflicts. The supervisor retains sole authority for final resolution.
                    </p>
                  </div>

                  {/* Resolution Action Bar (Desktop) */}
                  {selectedConflict.status === 'ACTIVE' && (
                    <div className="pt-4 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                          Supervisor Resolution Decision:
                        </span>
                        {!canResolve && (
                          <span className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> Requires Supervisor Clearance
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {/* Accept A */}
                        <button
                          onClick={() => handleResolve(selectedConflict.id, 'USE_LOCAL')}
                          disabled={!canResolve || isResolving}
                          className={`py-3 px-4 rounded-xl text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 ${
                            !canResolve 
                              ? 'bg-slate-300 cursor-not-allowed opacity-75' 
                              : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
                          }`}
                        >
                          {!canResolve ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          <span>Accept A ({selectedConflict.localUser || 'Technician A'})</span>
                        </button>

                        {/* Accept B */}
                        <button
                          onClick={() => handleResolve(selectedConflict.id, 'USE_SERVER')}
                          disabled={!canResolve || isResolving}
                          className={`py-3 px-4 rounded-xl text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 ${
                            !canResolve 
                              ? 'bg-slate-300 cursor-not-allowed opacity-75' 
                              : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.99]'
                          }`}
                        >
                          {!canResolve ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          <span>Accept B ({selectedConflict.remoteUser || 'Technician B'})</span>
                        </button>

                        {/* Manual Resolution */}
                        <button
                          onClick={openManualResolution}
                          disabled={!canResolve || isResolving}
                          className={`py-3 px-4 rounded-xl font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 border ${
                            !canResolve 
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 active:scale-[0.99]'
                          }`}
                        >
                          {!canResolve ? <Lock className="w-4 h-4" /> : <Edit3 className="w-4 h-4 text-emerald-400" />}
                          <span>Manual Resolution</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================== */}
                {/* MOBILE LAYOUT (Stacked Order: Technician A -> ↓ -> Technician B -> ↓ -> Evidence -> ↓ -> AI suggestion -> ↓ -> Resolution) */}
                {/* ========================================================== */}
                <div className="block sm:hidden space-y-4">
                  {/* 1. Technician A */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 font-mono">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>Technician A ({selectedConflict.localUser || selectedConflict.technicianName})</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800">
                        Local Entry
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-blue-200 font-mono text-xs text-rose-700 font-bold break-words">
                      Old / Local Value: {selectedConflict.localValue}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 pt-1">
                      <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>{selectedConflict.localTimestamp ? new Date(selectedConflict.localTimestamp).toLocaleString() : 'Recent'}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 italic">"{selectedConflict.localNotes || 'No notes'}"</p>
                      {selectedConflict.localGps && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
                          <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                          {renderGps(selectedConflict.localGps)}
                        </div>
                      )}
                      {selectedConflict.localOperationId && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono pt-1 border-t border-blue-100">
                          <Hash className="w-3 h-3 text-slate-400" />
                          <span>OpID: {selectedConflict.localOperationId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ↓ Arrow Divider 1 */}
                  <div className="flex justify-center text-slate-400 py-0.5">
                    <ArrowDown className="w-5 h-5 text-blue-600 animate-bounce" />
                  </div>

                  {/* 3. Technician B */}
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-purple-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 font-mono">
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        <span>Technician B ({selectedConflict.remoteUser || selectedConflict.supervisorName || 'Technician B'})</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-100 text-purple-800">
                        Remote Entry
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-purple-200 font-mono text-xs text-emerald-700 font-bold break-words">
                      New / Server Value: {selectedConflict.serverValue}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 pt-1">
                      <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                        <Clock className="w-3 h-3 text-purple-600" />
                        <span>{selectedConflict.remoteTimestamp ? new Date(selectedConflict.remoteTimestamp).toLocaleString() : 'Recent'}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 italic">"{selectedConflict.remoteNotes || 'No notes'}"</p>
                      {selectedConflict.remoteGps && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
                          <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                          {renderGps(selectedConflict.remoteGps)}
                        </div>
                      )}
                      {selectedConflict.remoteOperationId && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono pt-1 border-t border-purple-100">
                          <Hash className="w-3 h-3 text-slate-400" />
                          <span>OpID: {selectedConflict.remoteOperationId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ↓ Arrow Divider 2 */}
                  <div className="flex justify-center text-slate-400 py-0.5">
                    <ArrowDown className="w-5 h-5 text-purple-600 animate-bounce" />
                  </div>

                  {/* 5. Evidence */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Camera className="w-4 h-4 text-slate-600" />
                      <span>Evidence</span>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-blue-700 uppercase font-mono">Technician A Photo:</span>
                        {renderEvidencePhotos(selectedConflict.localEvidence) || <p className="text-[10px] text-slate-400 italic">No photo uploaded</p>}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase font-mono">Technician B Photo:</span>
                        {renderEvidencePhotos(selectedConflict.remoteEvidence) || <p className="text-[10px] text-slate-400 italic">No photo uploaded</p>}
                      </div>
                    </div>
                  </div>

                  {/* ↓ Arrow Divider 3 */}
                  <div className="flex justify-center text-slate-400 py-0.5">
                    <ArrowDown className="w-5 h-5 text-indigo-600 animate-bounce" />
                  </div>

                  {/* 7. AI suggestion area */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>AI Suggestion Area:</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        aiStatusText === 'GEMINI AI — ONLINE'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : aiStatusText === 'LOCAL AI — OFFLINE'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}>
                        {aiStatusText}
                      </span>
                    </div>

                    <p className="text-slate-800 leading-relaxed text-[11px] font-medium">
                      {isLoadingAi ? 'Analyzing notes, photos, timestamps, and evidence...' : (aiSuggestion || 'AI Suggestion: Technician A recorded defect observation. Supervisor manual review recommended.')}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono italic">
                      * AI suggestion only. AI does not resolve conflicts automatically.
                    </p>
                  </div>

                  {/* ↓ Arrow Divider 4 */}
                  <div className="flex justify-center text-slate-400 py-0.5">
                    <ArrowDown className="w-5 h-5 text-emerald-600 animate-bounce" />
                  </div>

                  {/* 9. Resolution */}
                  {selectedConflict.status === 'ACTIVE' && (
                    <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                          Resolution:
                        </span>
                        {!canResolve && <Lock className="w-4 h-4 text-amber-400" />}
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleResolve(selectedConflict.id, 'USE_LOCAL')}
                          disabled={!canResolve || isResolving}
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept A</span>
                        </button>

                        <button
                          onClick={() => handleResolve(selectedConflict.id, 'USE_SERVER')}
                          disabled={!canResolve || isResolving}
                          className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept B</span>
                        </button>

                        <button
                          onClick={openManualResolution}
                          disabled={!canResolve || isResolving}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-xs transition flex items-center justify-center gap-2"
                        >
                          <Edit3 className="w-4 h-4 text-emerald-400" />
                          <span>Manual Resolution</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-400 shadow-2xs">
                Select a conflict to open Supervisor Conflict Center.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Resolution Modal */}
      {showManualModal && selectedConflict && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-900 text-emerald-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Supervisor Manual Resolution
                  </h3>
                  <p className="text-xs text-slate-500">
                    Asset: {selectedConflict.equipmentName} ({selectedConflict.inspectionCode})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowManualModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Manual Final Value / Overridden State:
                </label>
                <input
                  type="text"
                  value={manualValueInput}
                  onChange={(e) => setManualValueInput(e.target.value)}
                  placeholder="e.g. FAIL - Recharged to 140 PSI on-site"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-slate-900 text-xs focus:outline-hidden focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supervisor Audit Notes & Rationale:
                </label>
                <textarea
                  rows={3}
                  value={manualNotesInput}
                  onChange={(e) => setManualNotesInput(e.target.value)}
                  placeholder="Provide explicit supervisory justification for this resolution..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-600" /> Immutable Audit Trace
                </span>
                <p>
                  This decision will be cryptographically signed under <strong>{currentUser?.name} ({currentUser?.role})</strong> with Operation ID and committed to the immutable audit log.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>

              <button
                onClick={() => handleResolve(selectedConflict.id, 'MANUAL_MERGE', manualValueInput, manualNotesInput)}
                disabled={isResolving || !manualValueInput.trim()}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Commit Supervisor Decision</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
