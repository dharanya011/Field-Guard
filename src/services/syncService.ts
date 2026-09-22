import { db } from '../db/offlineDb';
import { ApiClient } from './api';
import { crdtManager } from './crdtService';
import { detectSemanticConflicts } from './semanticConflictDetector';
import type { Inspection, PendingOperationRecord } from '../types';

export type SyncStateStatus = 'IDLE' | 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface SyncEngineStats {
  pendingOpsCount: number;
  unsyncedInspectionsCount: number;
  lastSyncedAt: Date | null;
  syncState: SyncStateStatus;
  isWsConnected: boolean;
  lastSyncError?: string;
}

type SyncListener = (stats: SyncEngineStats) => void;

class RealtimeSyncEngine {
  private ws: WebSocket | null = null;
  private isWsConnected = false;
  private currentStatus: SyncStateStatus = 'IDLE';
  private lastSyncedAt: Date | null = null;
  private lastSyncError: string | undefined;
  private syncListeners = new Set<SyncListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedTime = localStorage.getItem('wa1_last_synced_at');
      if (savedTime) {
        this.lastSyncedAt = new Date(savedTime);
      }
    }
  }

  public subscribe(listener: SyncListener) {
    this.syncListeners.add(listener);
    this.notifyListeners();
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private async notifyListeners() {
    try {
      const pendingOpsCount = await db.pendingOperations.count();
      const unsyncedInspectionsCount = await db.inspections.where('syncState').equals('PENDING').count();

      const stats: SyncEngineStats = {
        pendingOpsCount,
        unsyncedInspectionsCount,
        lastSyncedAt: this.lastSyncedAt,
        syncState: this.currentStatus,
        isWsConnected: this.isWsConnected,
        lastSyncError: this.lastSyncError
      };

      this.syncListeners.forEach(listener => listener(stats));
    } catch {
      // Ignore Dexie read errors if DB opening
    }
  }

  // ==========================================
  // WEBSOCKET BIDIRECTIONAL CHANNEL
  // ==========================================
  public initWebSocket() {
    if (typeof window === 'undefined' || this.ws) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/sync`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isWsConnected = true;
        console.log('[WA-1 WS CLIENT] Connected to Realtime Sync Channel');
        this.notifyListeners();

        // Heartbeat ping every 30 seconds
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SYNC_EVENT' || data.type === 'INSPECTION_UPDATED' || data.type === 'CONFLICT_DETECTED') {
            console.log('[WA-1 WS EVENT] Realtime update notification received:', data);
            // Auto trigger a background pull when remote sync event occurs
            this.triggerPullOnly();
          }
        } catch {
          // Ignore
        }
      };

      this.ws.onclose = () => {
        this.isWsConnected = false;
        this.ws = null;
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.notifyListeners();

        // Attempt silent reconnect in 10 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.initWebSocket();
          }, 10000);
        }
      };

      this.ws.onerror = () => {
        this.isWsConnected = false;
        this.notifyListeners();
      };
    } catch {
      this.isWsConnected = false;
    }
  }

  // ==========================================
  // COMPLETE 7-STEP SYNC CYCLE
  // ==========================================
  public async executeSync(isOnline: boolean, isSimulatedOffline: boolean): Promise<boolean> {
    // Step 1 & 2: Check network
    if (!isOnline || isSimulatedOffline) {
      console.log('[WA-1 SYNC] Device offline or simulated offline. Retaining queue locally.');
      this.currentStatus = 'IDLE';
      this.notifyListeners();
      return false;
    }

    this.currentStatus = 'SYNCING';
    this.lastSyncError = undefined;
    this.notifyListeners();

    try {
      // Step 3: Local pending operations gather with CRDT vectors
      const pendingItems = await db.inspections.where('syncState').equals('PENDING').toArray();
      const queuedOps = await db.pendingOperations.where('status').equals('QUEUED').toArray();

      const clientId = crdtManager.getClientId();

      const opsPayload = [
        ...queuedOps.map((op: PendingOperationRecord) => {
          const itemDoc = crdtManager.getOrCreateDoc(op.entityId);
          const crdtState = crdtManager.encodeDocState(itemDoc);

          return {
            type: op.type,
            entityId: op.entityId,
            entityType: op.entityType || 'INSPECTION',
            payload: (op.payload as Record<string, unknown>) || {},
            timestamp: op.timestamp,
            clientId: op.clientId || clientId,
            operationId: op.operationId || op.id,
            version: op.version || 1,
            crdtUpdate: op.crdtUpdate || crdtState
          };
        }),
        ...pendingItems.map((item: Inspection) => {
          const itemDoc = crdtManager.getOrCreateDoc(item.id, item);
          const crdtState = crdtManager.encodeDocState(itemDoc);

          return {
            type: 'UPDATE_INSPECTION',
            entityId: item.id,
            entityType: 'INSPECTION',
            payload: {
              id: item.id,
              code: item.code,
              title: item.title,
              equipmentId: item.equipmentId,
              equipmentName: item.equipmentName,
              facility: item.facility,
              zone: item.zone,
              status: item.status,
              score: item.score,
              riskLevel: item.riskLevel,
              generalNotes: item.generalNotes,
              checklist: item.checklist,
              defects: item.defects,
              signatures: item.signatures,
              version: item.version
            },
            timestamp: item.lastModified || new Date().toISOString(),
            clientId,
            operationId: `op-crdt-${Date.now()}-${item.id.substring(0, 4)}`,
            version: item.version,
            crdtUpdate: crdtState
          };
        })
      ];

      let pushedItemIds: string[] = [];

      // Step 4: Push local CRDT operations to server
      if (opsPayload.length > 0) {
        const pushResult = await ApiClient.pushSync(opsPayload, clientId);

        if (!pushResult || !pushResult.success) {
          throw new Error('Backend server did not confirm push operation.');
        }

        pushedItemIds = pushResult.syncedItemIds || [];

        // Remove confirmed ops from pendingOperations queue
        for (const op of queuedOps) {
          await db.pendingOperations.delete(op.id);
        }
      }

      // Step 5: Pull remote changes from server
      const lastSyncIso = this.lastSyncedAt ? this.lastSyncedAt.toISOString() : undefined;
      const pullResult = await ApiClient.pullSync(lastSyncIso);

      if (pullResult && pullResult.success && Array.isArray(pullResult.inspections)) {
        // Step 6: CRDT MERGE & Semantic Conflict Check
        for (const remoteInsp of pullResult.inspections as Inspection[]) {
          const localExisting = await db.inspections.get(remoteInsp.id);

          if (localExisting) {
            // Check for Business Semantic Conflicts (e.g. PASS vs FAIL on same checklist item or overall inspection status)
            const semanticConflicts = detectSemanticConflicts(localExisting, remoteInsp, queuedOps);

            if (semanticConflicts.length > 0) {
              // Store all detected semantic conflicts in Dexie IndexedDB
              for (const conflictItem of semanticConflicts) {
                await db.conflicts.put(conflictItem);
              }

              // Set local inspection status & syncState to CONFLICT without silently overwriting local edits
              await db.inspections.put({
                ...localExisting,
                status: 'CONFLICT',
                syncState: 'CONFLICT',
                offlineDraft: true
              });

              // Mark related local pending operations as CONFLICT
              const relatedOps = await db.pendingOperations.where('entityId').equals(remoteInsp.id).toArray();
              for (const op of relatedOps) {
                await db.pendingOperations.update(op.id, { status: 'CONFLICT' });
              }

              await db.syncStatus.put({
                id: `sync-${remoteInsp.id}`,
                entityType: 'INSPECTION',
                entityId: remoteInsp.id,
                status: 'CONFLICT',
                pendingChangesCount: relatedOps.length,
                lastAttemptAt: new Date().toISOString()
              });

              continue;
            }

            if (localExisting.syncState === 'PENDING' && !pushedItemIds.includes(remoteInsp.id)) {
              // Deterministic CRDT Merge using Yjs without overwriting unpushed local edits
              const mergedInsp = crdtManager.mergeInspectionsWithCrdt(
                localExisting,
                remoteInsp,
                (remoteInsp as unknown as Record<string, unknown>).crdtUpdate as string | undefined
              );

              await db.inspections.put({
                ...mergedInsp,
                syncState: 'SYNCED',
                offlineDraft: false
              });
            } else {
              // Update local IndexedDB source of truth
              await db.inspections.put({
                ...remoteInsp,
                syncState: 'SYNCED',
                offlineDraft: false
              });
            }
          } else {
            // New remote record
            await db.inspections.put({
              ...remoteInsp,
              syncState: 'SYNCED',
              offlineDraft: false
            });
          }

          await db.syncStatus.put({
            id: `sync-${remoteInsp.id}`,
            entityType: 'INSPECTION',
            entityId: remoteInsp.id,
            status: 'SYNCED',
            pendingChangesCount: 0,
            lastAttemptAt: new Date().toISOString()
          });
        }
      }

      // Step 7: Update confirmed local pending items to SYNCED
      for (const item of pendingItems) {
        await db.inspections.update(item.id, {
          syncState: 'SYNCED',
          offlineDraft: false,
          lastModified: new Date().toISOString()
        });

        await db.syncStatus.put({
          id: `sync-${item.id}`,
          entityType: 'INSPECTION',
          entityId: item.id,
          status: 'SYNCED',
          pendingChangesCount: 0,
          lastAttemptAt: new Date().toISOString()
        });
      }

      // Complete
      this.lastSyncedAt = new Date();
      if (typeof window !== 'undefined') {
        localStorage.setItem('wa1_last_synced_at', this.lastSyncedAt.toISOString());
      }

      this.currentStatus = 'SYNCED';
      this.notifyListeners();

      // Reset to IDLE after 2 seconds
      setTimeout(() => {
        this.currentStatus = 'IDLE';
        this.notifyListeners();
      }, 2000);

      return true;

    } catch (err: unknown) {
      const error = err as Error;
      console.warn('[WA-1 SYNC ENGINE] Interrupted or network failed. Operations safely preserved in Dexie:', error.message);

      this.lastSyncError = error.message || 'Sync failed due to network timeout.';
      this.currentStatus = 'FAILED';
      this.notifyListeners();

      // Revert status to IDLE after 3 seconds so user can retry
      setTimeout(() => {
        this.currentStatus = 'IDLE';
        this.notifyListeners();
      }, 3000);

      return false;
    }
  }

  // Silent Pull Trigger for background WebSocket events
  public async triggerPullOnly() {
    try {
      const lastSyncIso = this.lastSyncedAt ? this.lastSyncedAt.toISOString() : undefined;
      const pullResult = await ApiClient.pullSync(lastSyncIso);

      if (pullResult && pullResult.success && Array.isArray(pullResult.inspections)) {
        for (const remoteInsp of pullResult.inspections as Inspection[]) {
          const localExisting = await db.inspections.get(remoteInsp.id);
          if (!localExisting || localExisting.syncState === 'SYNCED') {
            await db.inspections.put({
              ...remoteInsp,
              syncState: 'SYNCED',
              offlineDraft: false
            });
          }
        }
        this.notifyListeners();
      }
    } catch {
      // Silent fail on background pull
    }
  }
}

export const syncEngine = new RealtimeSyncEngine();
