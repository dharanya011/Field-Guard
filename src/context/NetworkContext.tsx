import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db/offlineDb';

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
  const [unsyncedChangesCount, setUnsyncedChangesCount] = useState<number>(1);
  const [storageUsage, setStorageUsage] = useState<{ usedKb: number; recordCount: number }>({
    usedKb: 48,
    recordCount: 5
  });

  const effectiveOnline = hardwareOnline && !isSimulatedOffline;

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
    if (!effectiveOnline) return;

    setSyncStatus('SYNCING');
    // Actual Dexie sync cycle: transitions pending drafts to synced
    setTimeout(async () => {
      try {
        const pendingItems = await db.inspections.where('syncState').equals('PENDING').toArray();
        for (const item of pendingItems) {
          await db.inspections.update(item.id, {
            syncState: 'SYNCED',
            offlineDraft: false,
            lastModified: new Date().toISOString()
          });
          // Update sync status record
          await db.syncStatus.put({
            id: `sync-${item.id}`,
            entityType: 'INSPECTION',
            entityId: item.id,
            status: 'SYNCED',
            pendingChangesCount: 0,
            lastAttemptAt: new Date().toISOString()
          });
        }

        // Mark pending operations as processed
        const queuedOps = await db.pendingOperations.where('status').equals('QUEUED').toArray();
        for (const op of queuedOps) {
          await db.pendingOperations.update(op.id, { status: 'IN_FLIGHT' });
          await db.pendingOperations.delete(op.id);
        }

        await updateCounts();
        setSyncStatus('SUCCESS');
        const now = new Date();
        setLastSyncedAt(now);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wa1_last_synced_at', now.toISOString());
        }

        setTimeout(() => {
          setSyncStatus('IDLE');
        }, 2000);
      } catch {
        setSyncStatus('ERROR');
        setTimeout(() => setSyncStatus('IDLE'), 3000);
      }
    }, 1200);
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
        storageUsage
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
