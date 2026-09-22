import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  RefreshCw, 
  HardDrive, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';

export const PersistentNetworkBanner: React.FC = () => {
  const { 
    isOnline, 
    isSimulatedOffline, 
    toggleSimulatedOffline, 
    unsyncedChangesCount, 
    syncStatus, 
    triggerManualSync, 
    storageUsage,
    lastSyncedAt
  } = useNetwork();

  return (
    <div 
      id="persistent-network-banner"
      role="status" 
      aria-live="polite"
      className={`w-full border-b select-none transition-colors duration-200 ${
        isOnline 
          ? 'bg-slate-900 text-slate-200 border-slate-800' 
          : 'bg-rose-950 text-rose-100 border-rose-900 shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Persistent Status Badge & Offline/Online Message */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Status Badge */}
          {isOnline ? (
            <span 
              id="online-status-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              🟢 ONLINE
            </span>
          ) : (
            <span 
              id="offline-status-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-600 text-white border border-rose-400 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              🔴 OFFLINE
            </span>
          )}

          {/* User Facing Message */}
          <div className="text-xs sm:text-sm font-medium">
            {!isOnline ? (
              <span className="text-rose-100 font-semibold tracking-tight">
                You&apos;re offline. Your changes are safely stored on this device.
              </span>
            ) : (
              <span className="text-slate-300">
                Connected to Field Cloud Network • Local IndexedDB (Dexie.js) primary engine active
              </span>
            )}
          </div>
        </div>

        {/* Right: Storage, Sync Status & Offline Simulation Toggle */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Storage & Engine indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[11px] font-mono">
            <Database className="w-3 h-3 text-blue-400" />
            <span>Dexie IndexedDB: {storageUsage.recordCount} records ({storageUsage.usedKb} KB)</span>
          </div>

          {/* Sync State Badge: Strictly never claims "Synced" unless zero unsynced items */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono">
            {unsyncedChangesCount > 0 ? (
              <div className="flex items-center gap-1 text-amber-300 font-semibold">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{unsyncedChangesCount} Pending Sync</span>
              </div>
            ) : !isOnline ? (
              <div className="flex items-center gap-1 text-rose-300 font-medium">
                <HardDrive className="w-3 h-3 text-rose-400" />
                <span>Local Storage Active</span>
              </div>
            ) : lastSyncedAt ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Synced</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-slate-400">
                <span>Not Synced</span>
              </div>
            )}
          </div>

          {/* Interactive Simulation Switch (allows testing the exact demo anytime) */}
          <button
            id="toggle-simulated-network-btn"
            onClick={toggleSimulatedOffline}
            className={`px-3 py-1 rounded-md font-semibold text-[11px] transition shadow-xs flex items-center gap-1.5 border active:scale-95 ${
              isOnline
                ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border-rose-700/60'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-sm'
            }`}
            title="Toggle simulated network disconnection to test Dexie.js offline persistence"
          >
            {isOnline ? (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Simulate Offline</span>
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3" />
                <span>Reconnect Online</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
