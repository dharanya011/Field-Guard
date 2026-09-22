import React, { useState } from 'react';
import { History, Shield, Lock, Search, Filter, ShieldCheck } from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';

export const AuditHistoryView: React.FC = () => {
  const { auditLogs } = useInspections();
  const [searchTerm, setSearchTerm] = useState('');
  const [targetFilter, setTargetFilter] = useState('ALL');

  const filtered = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.hash.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = targetFilter === 'ALL' ? true : log.targetType === targetFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50/40 to-white border border-indigo-200 shadow-sm">
        <div>
          <span className="text-xs font-mono font-bold text-indigo-700 uppercase tracking-wider">
            IMMUTABLE SECURITY LEDGER
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight font-display">
            Compliance & Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Cryptographically signed event ledger recording every checklist update, supervisor sign-off, and CRDT divergence reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>SHA-256 INTEGRITY VALIDATED</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, actor, target or hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'INSPECTION', 'CONFLICT', 'EQUIPMENT', 'USER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setTargetFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                targetFilter === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {filtered.map((log) => (
          <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-indigo-700 font-bold">{log.action}</span>
                <span className="text-slate-400">•</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                  {log.targetType}: {log.targetId}
                </span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
              {log.details}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-900 font-semibold">{log.userName}</span>
                <span>({log.userRole})</span>
                <span className="text-slate-400 hidden sm:inline">via {log.ipAddress}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>hash:{log.hash}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
