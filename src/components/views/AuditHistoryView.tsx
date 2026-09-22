import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  User, 
  Wifi, 
  Camera, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  GitCommit,
  Hash,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import type { EvidencePhoto } from '../../types';

export const AuditHistoryView: React.FC = () => {
  const { auditLogs } = useInspections();
  const [searchTerm, setSearchTerm] = useState('');
  const [targetFilter, setTargetFilter] = useState('ALL');

  const filtered = auditLogs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(searchLower) ||
      log.userName.toLowerCase().includes(searchLower) ||
      log.details.toLowerCase().includes(searchLower) ||
      log.targetId.toLowerCase().includes(searchLower) ||
      (log.operationId && log.operationId.toLowerCase().includes(searchLower)) ||
      (log.entityId && log.entityId.toLowerCase().includes(searchLower)) ||
      (log.resolver && log.resolver.toLowerCase().includes(searchLower)) ||
      log.hash.toLowerCase().includes(searchLower);

    const matchesFilter = targetFilter === 'ALL' ? true : log.targetType === targetFilter;
    return matchesSearch && matchesFilter;
  });

  const renderEvidencePhotos = (evidence?: EvidencePhoto[] | string) => {
    if (!evidence) return null;
    if (typeof evidence === 'string') {
      return (
        <span className="text-[10px] font-mono text-slate-600 truncate bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Photo Evidence: {evidence}
        </span>
      );
    }
    if (Array.isArray(evidence) && evidence.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {evidence.map((ev, idx) => (
            <div key={ev.id || idx} className="p-1 rounded bg-slate-100 border border-slate-200 text-[10px] flex items-center gap-1">
              <Camera className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="font-mono text-slate-700 truncate max-w-[120px]">{ev.caption || ev.description || 'Photo Evidence'}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getNetworkBadge = (state?: string) => {
    switch (state) {
      case 'ONLINE':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">ONLINE</span>;
      case 'OFFLINE':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">OFFLINE</span>;
      case 'CELLULAR':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">CELLULAR</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">SYNCED</span>;
    }
  };

  const getConflictBadge = (status?: string) => {
    switch (status) {
      case 'SEMANTIC_CONFLICT':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> CONFLICT</span>;
      case 'RESOLVED':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> RESOLVED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              IMMUTABLE COMPLIANCE AUDIT
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Operation & State Ledger
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1.5 tracking-tight font-display">
            Audit Trail & Operation Timeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Complete sequence of operation IDs, entity IDs, user IDs, timestamps, network states, evidence, previous vs new values, semantic conflict states, and supervisor resolution times.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-800/80 self-start sm:self-auto font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>CRYPTOGRAPHICALLY SEALED</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Operation ID, Entity ID, User, Action or Hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'INSPECTION', 'CONFLICT', 'EQUIPMENT', 'USER', 'SYSTEM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setTargetFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                targetFilter === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Timeline Stream */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider font-mono flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-indigo-600" />
          <span>Audit Timeline Events ({filtered.length})</span>
        </h3>

        <div className="relative pl-4 sm:pl-6 border-l-2 border-indigo-200 space-y-6">
          {filtered.map((log) => (
            <div key={log.id} className="relative group">
              {/* Timeline Marker Dot */}
              <div className="absolute -left-[21px] sm:-left-[29px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-2xs group-hover:scale-125 transition" />

              {/* Event Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-indigo-300 transition space-y-3">
                {/* Top Row: Time & Header Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {log.action}
                    </span>
                    {getConflictBadge(log.conflictStatus)}
                    {getNetworkBadge(log.networkState)}
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="text-slate-300">•</span>
                    <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Event Description */}
                <p className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed">
                  {log.details}
                </p>

                {/* State Value Comparison (Previous Value -> New Value) */}
                {(log.previousValue || log.newValue) && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Previous:</span>
                      <span className="text-slate-800 font-semibold">{log.previousValue || 'N/A'}</span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />

                    <div className="flex items-center gap-2 text-emerald-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400">New / Merged:</span>
                      <span className="text-emerald-700 font-bold">{log.newValue || 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Extended Details Grid: OpID, Entity ID, Evidence, Resolver */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-600">
                  {/* User / Actor */}
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">User: <strong className="text-slate-900">{log.userName}</strong> ({log.userId})</span>
                  </div>

                  {/* Operation ID */}
                  <div className="flex items-center gap-1.5 truncate">
                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">OpID: <strong className="text-indigo-900">{log.operationId || log.targetId}</strong></span>
                  </div>

                  {/* Entity ID */}
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Entity: <strong className="text-slate-900">{log.entityId || log.targetType}</strong></span>
                  </div>

                  {/* Resolver / Resolution Time */}
                  {log.resolver ? (
                    <div className="flex items-center gap-1.5 truncate text-emerald-800">
                      <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Resolved By: <strong>{log.resolver}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 truncate text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Hash: {log.hash}</span>
                    </div>
                  )}
                </div>

                {/* Evidence Attachment Line */}
                {log.evidence && (
                  <div className="pt-2 border-t border-slate-100">
                    {renderEvidencePhotos(log.evidence)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
