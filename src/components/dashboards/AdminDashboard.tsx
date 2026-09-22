import React from 'react';
import { 
  Users, 
  Wrench, 
  UserCheck, 
  Layers, 
  Activity, 
  Server, 
  ShieldCheck, 
  Database, 
  HardDrive, 
  Radio, 
  History,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';
import { StatusBadge } from '../common/StatusBadge';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { currentUser, usersList } = useAuth();
  const { inspections, equipments, auditLogs } = useInspections();
  const { isOnline, storageUsage, lastSyncedAt } = useNetwork();

  const techniciansCount = usersList.filter(u => u.role === 'TECHNICIAN').length;
  const supervisorsCount = usersList.filter(u => u.role === 'SUPERVISOR').length;
  const adminsCount = usersList.filter(u => u.role === 'ADMIN').length;

  const operationalEq = equipments.filter(e => e.status === 'OPERATIONAL').length;
  const maintenanceEq = equipments.filter(e => e.status === 'NEEDS_MAINTENANCE' || e.status === 'CRITICAL_OFFLINE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              SYSTEM ROOT & FLEET ADMINISTRATION
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Admin Node: WA-ADM-001
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 tracking-tight font-display">
            Enterprise Infrastructure Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Global equipment asset registry, RBAC role credentials, Dexie IndexedDB sync gateways, and cryptographic audit ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('users')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </button>
          <button
            onClick={() => onNavigate('equipment')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition"
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Equipment Fleet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Users, Technicians, Supervisors, Inspections, Equipment, System Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Users */}
        <div 
          onClick={() => onNavigate('users')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Users</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{usersList.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">RBAC Active</p>
        </div>

        {/* Technicians */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Technicians</span>
            <Wrench className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 font-mono">{techniciansCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Field certified</p>
        </div>

        {/* Supervisors */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Supervisors</span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700 font-mono">{supervisorsCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Lead auditors</p>
        </div>

        {/* Inspections */}
        <div 
          onClick={() => onNavigate('inspections')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Inspections</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">{inspections.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Across 3 facilities</p>
        </div>

        {/* Equipment */}
        <div 
          onClick={() => onNavigate('equipment')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs cursor-pointer hover:border-slate-300 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Equipment</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-sky-700 font-mono">{equipments.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">{operationalEq} operational</p>
        </div>

        {/* System Status */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Core Engine</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-700 font-mono">HEALTHY</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 font-mono">99.98% uptime</p>
        </div>
      </div>

      {/* System Architecture & Status Telemetry Card (Stack verification) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">System Infrastructure Health</h2>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
            ALL PROTOCOLS ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Node/Express Backend */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Backend API</span>
              <StatusBadge status="OPERATIONAL" size="sm" />
            </div>
            <p className="font-bold text-slate-900">Node.js + Express + TS</p>
            <p className="text-[11px] text-slate-500 font-mono">REST & WebSocket Hub</p>
          </div>

          {/* Dexie IndexedDB */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Offline Engine</span>
              <StatusBadge status="SYNCED" size="sm" />
            </div>
            <p className="font-bold text-slate-900">Dexie.js IndexedDB</p>
            <p className="text-[11px] text-slate-500 font-mono">~{storageUsage.usedKb} KB cached ({storageUsage.recordCount} docs)</p>
          </div>

          {/* Synchronization CRDT */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Sync Architecture</span>
              <StatusBadge status="PASS" size="sm" />
            </div>
            <p className="font-bold text-slate-900">Yjs + CRDT State</p>
            <p className="text-[11px] text-slate-500 font-mono">Multi-Master Vector Clocks</p>
          </div>

          {/* Security & RBAC */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Security Core</span>
              <StatusBadge status="PASS" size="sm" />
            </div>
            <p className="font-bold text-slate-900">JWT + HTTPS + RBAC</p>
            <p className="text-[11px] text-slate-500 font-mono">SHA-256 Audit Hashes</p>
          </div>
        </div>
      </div>

      {/* Equipment Fleet Summary & Audit Stream Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Fleet Status Overview */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">Critical Equipment Assets</h2>
            </div>
            <button
              onClick={() => onNavigate('equipment')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Fleet Registry</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {equipments.map((eq) => (
              <div key={eq.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-900">{eq.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {eq.tag} • {eq.facility}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {eq.healthScore}% Health
                  </span>
                  <StatusBadge status={eq.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Stream with Cryptographic Hashes */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">Live Security & Audit Trail</h2>
            </div>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                  <span className="text-blue-600 font-bold">{log.action}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-800 font-sans text-xs font-medium">{log.details}</p>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Actor: {log.userName}</span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    hash: {log.hash}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
