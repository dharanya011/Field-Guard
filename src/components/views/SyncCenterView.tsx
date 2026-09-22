import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  FileText, 
  ShieldCheck, 
  RotateCcw 
} from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { useInspections } from '../../context/InspectionContext';
import { db, initDatabase } from '../../db/offlineDb';
import { StatusBadge } from '../common/StatusBadge';

export const SyncCenterView: React.FC = () => {
  const { 
    isOnline, 
    isSimulatedOffline, 
    toggleSimulatedOffline, 
    syncStatus, 
    triggerManualSync, 
    unsyncedChangesCount, 
    lastSyncedAt,
    storageUsage 
  } = useNetwork();
  const { refreshAllData } = useInspections();

  const [tableCounts, setTableCounts] = useState({
    inspections: 0,
    equipment: 0,
    conflicts: 0,
    auditLogs: 0
  });

  const loadCounts = async () => {
    try {
      const [insp, eq, conf, aud] = await Promise.all([
        db.inspections.count(),
        db.equipment.count(),
        db.conflicts.count(),
        db.auditLogs.count()
      ]);
      setTableCounts({
        inspections: insp,
        equipment: eq,
        conflicts: conf,
        auditLogs: aud
      });
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadCounts();
  }, [unsyncedChangesCount]);

  const handleResetData = async () => {
    if (window.confirm('Reset local IndexedDB store to initial certified seed records?')) {
      await db.delete();
      await db.open();
      await initDatabase();
      await refreshAllData();
      await loadCounts();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Row: Title & Subtitle on left, Action Buttons on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Local Storage & Sync Gateway
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Inspections, sensor telemetry, and defect logs are stored natively inside your device's browser database using Dexie IndexedDB.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={triggerManualSync}
            disabled={!isOnline || syncStatus === 'SYNCING'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-2xs active:scale-95 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>{syncStatus === 'SYNCING' ? 'Syncing...' : 'Trigger Full Sync'}</span>
          </button>

          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Reset database to demo seed"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset Demo DB</span>
          </button>
        </div>
      </div>

      {/* Network & Persistence Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Offline Simulation Control Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-900">Field Simulation</span>
            {isOnline ? <Wifi className="w-4 h-4 text-emerald-600" /> : <WifiOff className="w-4 h-4 text-rose-600" />}
          </div>
          <p className="text-xs text-slate-600">
            Simulate working in an underground tunnel or remote facility with zero cell signal:
          </p>
          <button
            onClick={toggleSimulatedOffline}
            className={`w-full py-2 rounded-xl text-xs font-semibold transition ${
              isSimulatedOffline
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            {isSimulatedOffline ? 'Disconnect Simulation (Go Online)' : 'Simulate Complete Offline Mode'}
          </button>
        </div>

        {/* Sync Queue Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs text-slate-500 font-medium">Unsynced Replicas</span>
          <p className="text-3xl font-bold font-mono text-slate-900">{unsyncedChangesCount}</p>
          <p className="text-[11px] text-slate-500">
            {unsyncedChangesCount > 0 ? 'Pending automatic transmission' : 'All local tables synced'}
          </p>
        </div>

        {/* Storage Size Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs text-slate-500 font-medium">IndexedDB Footprint</span>
          <p className="text-3xl font-bold font-mono text-blue-700">~{storageUsage.usedKb} KB</p>
          <p className="text-[11px] text-slate-500">{storageUsage.recordCount} total documents in Dexie</p>
        </div>

        {/* Last Sync Stamp */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs text-slate-500 font-medium">Last Synchronized</span>
          <p className="text-sm font-bold font-mono text-emerald-700 mt-2">
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Never'}
          </p>
          <p className="text-[11px] text-slate-400">Via WebSocket Gateway</p>
        </div>
      </div>

      {/* Dexie Tables Breakdown */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">
              Dexie.js IndexedDB Internal Schema Tables
            </h2>
          </div>
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-rose-700 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Local DB</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-mono text-blue-700 font-bold block">db.inspections</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{tableCounts.inspections}</p>
            <p className="text-[11px] text-slate-500">Audit records, checklists, defects</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-mono text-emerald-700 font-bold block">db.equipment</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{tableCounts.equipment}</p>
            <p className="text-[11px] text-slate-500">Assets, tags, and health ratings</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-mono text-rose-700 font-bold block">db.conflicts</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{tableCounts.conflicts}</p>
            <p className="text-[11px] text-slate-500">CRDT vector clock disputes</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-mono text-indigo-700 font-bold block">db.auditLogs</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{tableCounts.auditLogs}</p>
            <p className="text-[11px] text-slate-500">Cryptographic audit events</p>
          </div>
        </div>
      </div>

      {/* Advanced Research Architecture & Demo Modules (Section 22) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
              RESEARCH ARCHITECTURE MODULES
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1 tracking-tight font-display">
              Advanced IoT, Edge AI & Peer-to-Peer Subsystems
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Demo & Interface Status
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">MQTT-SN IoT Gateway</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                DEMO / NOT CONNECTED
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              MQTT for Sensor Networks gateway interface for telemetry stream ingestion.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">Bluetooth Device Sync</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                BLUETOOTH SYNC: DEMO MODE
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Peer-to-peer Bluetooth Low Energy operation log exchange between field units.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">Wi-Fi Direct Synchronization</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                WI-FI DIRECT SYNC: DEMO MODE
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Opportunistic ad-hoc local network sync between technicians without cell towers.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">Computer Vision Analysis</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-200 text-slate-800 border border-slate-300">
                VISION ANALYSIS: MODEL NOT CONFIGURED
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Evidence photo defect detection & weld stress fracture analysis pipeline.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">UAV / Drone Inspection Import</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-200">
                DRONE INTEGRATION: DEMO / IMPORT MODE
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Aerial thermal camera & lidar telemetry import for solar/wind/stack inspections.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">Predictive Maintenance Model</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-100 text-purple-900 border border-purple-200">
                RULE-BASED DEMO
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Vibration, temperature, and motor current decay rate remaining-useful-life engine.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
