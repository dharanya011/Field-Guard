import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db/offlineDb';
import { syncEngine, type SyncEngineStats } from '../services/syncService';

interface NetworkContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  setSimulatedOffline: (offline: boolean) => void;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastSyncedAt: Date | null;
  unsyncedChangesCount: number;
  triggerManualSync: () => Promise<void>;
  storageUsage: { usedKb: number; recordCount: number };
  isWsConnected: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hardwareOnline, setHardwareOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wa1_simulated_offline') === 'true';
    }
    return false;
  });
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wa1_last_synced_at');
      return stored ? new Date(stored) : null;
    }
    return null;
  });
  const [unsyncedChangesCount, setUnsyncedChangesCount] = useState<number>(0);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [storageUsage, setStorageUsage] = useState<{ usedKb: number; recordCount: number }>({
    usedKb: 48,
    recordCount: 5
  });

  const effectiveOnline = hardwareOnline && !isSimulatedOffline;

  // Initialize WebSocket and syncEngine subscriber
  useEffect(() => {
    syncEngine.initWebSocket();

    const unsubscribe = syncEngine.subscribe((stats: SyncEngineStats) => {
      setIsWsConnected(stats.isWsConnected);
      setLastSyncedAt(stats.lastSyncedAt);
      if (stats.syncState === 'SYNCING') setSyncStatus('SYNCING');
      else if (stats.syncState === 'SYNCED') setSyncStatus('SUCCESS');
      else if (stats.syncState === 'FAILED') setSyncStatus('ERROR');
      else setSyncStatus('IDLE');

      setUnsyncedChangesCount(stats.pendingOpsCount + stats.unsyncedInspectionsCount);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => setHardwareOnline(true);
    const handleOffline = () => setHardwareOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateCounts = useCallback(async () => {
    try {
      const pendingInspections = await db.inspections.where('syncState').equals('PENDING').count();
      const conflictInspections = await db.inspections.where('syncState').equals('CONFLICT').count();
      const pendingOps = await db.pendingOperations.where('status').equals('QUEUED').count();
      
      setUnsyncedChangesCount(Math.max(pendingInspections + conflictInspections, pendingOps));

      const totalRecords = await db.inspections.count();
      const itemsCount = await db.inspectionItems.count();
      const evidenceCount = await db.evidenceMetadata.count();
      setStorageUsage({
        usedKb: Math.round(totalRecords * 14 + itemsCount * 3 + evidenceCount * 25 + 32),
        recordCount: totalRecords + itemsCount + evidenceCount
      });
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    updateCounts();
  }, [updateCounts]);

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('wa1_simulated_offline', String(next));
      }
      return next;
    });
  };

  const setSimulatedOffline = (offline: boolean) => {
    setIsSimulatedOffline(offline);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wa1_simulated_offline', String(offline));
    }
  };

  const triggerManualSync = async () => {
    const success = await syncEngine.executeSync(effectiveOnline, isSimulatedOffline);
    await updateCounts();
    if (!success) {
      console.log('[WA-1 NETWORK CONTEXT] Offline or network error during sync. All data preserved locally.');
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        isOnline: effectiveOnline,
        isSimulatedOffline,
        toggleSimulatedOffline,
        setSimulatedOffline,
        syncStatus,
        lastSyncedAt,
        unsyncedChangesCount,
        triggerManualSync,
        storageUsage,
        isWsConnected
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
