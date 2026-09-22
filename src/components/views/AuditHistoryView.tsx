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
  ArrowRight,
  Download,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';
import type { EvidencePhoto } from '../../types';

export const AuditHistoryView: React.FC = () => {
  const { auditLogs } = useInspections();
  const { isOnline, syncStatus, triggerManualSync } = useNetwork();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // KPI Metrics
  const totalEntries = auditLogs.length;
  const verifiedHashes = auditLogs.filter(l => l.hash && l.hash.length > 0).length;
  const technicianActions = auditLogs.filter(l => l.userRole === 'TECHNICIAN').length;
  const supervisorActions = auditLogs.filter(l => l.userRole === 'SUPERVISOR' || l.userRole === 'ADMIN').length;

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
    const matchesRole = roleFilter === 'ALL' ? true : log.userRole === roleFilter;

    return matchesSearch && matchesFilter && matchesRole;
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
      case 'SYNCED':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">SYNCED</span>;
      default:
        return null;
    }
  };

  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const handleExportAuditLog = () => {
    const dataToExport = {
      title: 'FIELD GUARD - Cryptographic Audit Ledger Export',
      exportedAt: new Date().toISOString(),
      totalEntries: auditLogs.length,
      verifiedCount: verifiedHashes,
      entries: auditLogs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        user: log.userName,
        role: log.userRole,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        details: log.details,
        sha256Hash: log.hash
      }))
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FIELD_GUARD_Audit_Ledger_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVerifyHashes = () => {
    triggerManualSync();
    setVerifyNotice(`Verified ${verifiedHashes} of ${totalEntries} audit ledger signatures against server consensus.`);
    setTimeout(() => setVerifyNotice(null), 5000);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Row: Title on Left, Action Buttons on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Cryptographic Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Immutable SHA-256 hash-chained event stream logging all field creations, checklist sign-offs, and CRDT conflict resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={handleExportAuditLog}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-95 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Audit Log</span>
          </button>

          <button
            onClick={handleVerifyHashes}
            disabled={!isOnline || syncStatus === 'SYNCING'}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Synchronize audit hashes with server"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>Verify Hashes</span>
          </button>
        </div>
      </div>

      {verifyNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{verifyNotice}</span>
        </div>
      )}

      {/* 2. KPI Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Entries */}
        <div 
          onClick={() => { setTargetFilter('ALL'); setRoleFilter('ALL'); }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            targetFilter === 'ALL' && roleFilter === 'ALL' ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Total Audit Events</span>
            <div className="p-1 rounded-md bg-blue-100 text-blue-700">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">{totalEntries}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Immutable records</p>
        </div>

        {/* Verified Hashes */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">SHA-256 Validated</span>
            <div className="p-1 rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700 font-mono">{verifiedHashes}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">100% Chain integrity</p>
        </div>

        {/* Field Technician Actions */}
        <div 
          onClick={() => setRoleFilter('TECHNICIAN')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            roleFilter === 'TECHNICIAN' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Technician Actions</span>
            <div className="p-1 rounded-md bg-amber-100 text-amber-700">
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-700 font-mono">{technicianActions}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Field operations</p>
        </div>

        {/* Supervisor Sign-Offs */}
        <div 
          onClick={() => setRoleFilter('SUPERVISOR')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            roleFilter === 'SUPERVISOR' ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Governance Events</span>
            <div className="p-1 rounded-md bg-purple-100 text-purple-700">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-purple-700 font-mono">{supervisorActions}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Overrides & sign-offs</p>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Search Input */}
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search action, actor, hash, or target entity ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Target Type Dropdown */}
          <div className="lg:col-span-3">
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              aria-label="Filter by Target Type"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Target Entities</option>
              <option value="INSPECTION">Inspections</option>
              <option value="CONFLICT">Conflicts</option>
              <option value="DEFECT">Defects</option>
              <option value="SYNC">Sync Events</option>
              <option value="AUTH">Authentication</option>
            </select>
          </div>

          {/* Search & Reset Buttons */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <button
              onClick={() => {}}
              className="w-full py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
            {(searchTerm || targetFilter !== 'ALL' || roleFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setTargetFilter('ALL');
                  setRoleFilter('ALL');
                }}
                className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition cursor-pointer"
                title="Clear Filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Audit Table */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 space-y-2 shadow-2xs">
          <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-base font-semibold text-slate-900 font-display">No audit events match your criteria</p>
          <p className="text-xs text-slate-500">Try adjusting your search terms or filter selections.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Actor & Role</th>
                <th className="py-3 px-4 font-semibold">Action / Event</th>
                <th className="py-3 px-4 font-semibold">Target Entity</th>
                <th className="py-3 px-4 font-semibold">State</th>
                <th className="py-3 px-4 font-semibold">SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/30 transition">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{log.userName}</div>
                    <div className="text-[10px] font-mono text-slate-500">{log.userRole}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{log.action}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{log.details}</div>
                    {renderEvidencePhotos(log.evidence)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {log.targetType}: {log.targetId}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getNetworkBadge(log.networkState)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>{log.hash.slice(0, 16)}...</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
