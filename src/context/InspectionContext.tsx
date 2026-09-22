import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { 
  Inspection, 
  Equipment, 
  ConflictItem, 
  AuditLog, 
  ChecklistItem, 
  Defect, 
  InspectionStatus,
  ChecklistItemRecord,
  InspectionNoteRecord,
  EvidenceMetadataRecord,
  PendingOperationRecord,
  SyncStatusRecord,
  Operation,
  OperationStatus,
  OperationNetworkState
} from '../types';
import { db, initDatabase } from '../db/offlineDb';
import { useAuth } from './AuthContext';
import { useNetwork } from './NetworkContext';

interface InspectionContextType {
  inspections: Inspection[];
  equipments: Equipment[];
  conflicts: ConflictItem[];
  auditLogs: AuditLog[];
  operations: Operation[];
  isLoading: boolean;
  selectedInspection: Inspection | null;
  setSelectedInspection: (insp: Inspection | null) => void;
  updateChecklistItem: (
    inspectionId: string,
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => Promise<void>;
  addDefectToInspection: (inspectionId: string, defect: Omit<Defect, 'id' | 'timestamp' | 'resolved'>) => Promise<void>;
  changeInspectionStatus: (inspectionId: string, newStatus: InspectionStatus) => Promise<void>;
  resolveConflictItem: (conflictId: string, resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MANUAL_MERGE') => Promise<void>;
  createNewInspection: (data: {
    title: string;
    equipmentId: string;
    scheduledDate: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }) => Promise<Inspection>;
  saveInspection: (updatedInspection: Inspection) => Promise<void>;
  createOperation: (params: {
    entityId: string;
    entityName?: string;
    entityType: Operation['entityType'];
    field: string;
    oldValue: any;
    newValue: any;
    networkState?: OperationNetworkState;
    customOpId?: string;
    userId?: string;
    userName?: string;
  }) => Promise<Operation>;
  syncOperations: (targetOperationIds?: string[]) => Promise<{
    synced: number;
    failed: number;
    conflicts: number;
    message: string;
  }>;
  retryOperation: (operationId: string) => Promise<void>;
  resolveOperationConflict: (operationId: string, resolution: 'KEEP_LOCAL' | 'ACCEPT_SERVER') => Promise<void>;
  discardOperation: (operationId: string) => Promise<void>;
  generateExampleOperation: () => Promise<Operation>;
  logAuditEntry: (action: string, targetType: AuditLog['targetType'], targetId: string, details: string) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

export const InspectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { isOnline } = useNetwork();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const refreshAllData = useCallback(async () => {
    try {
      await initDatabase();
      const [allInspections, allEquipments, allConflicts, allAudit, allOperations] = await Promise.all([
        db.inspections.toArray(),
        db.equipment.toArray(),
        db.conflicts.toArray(),
        db.auditLogs.reverse().sortBy('timestamp'),
        db.operations.toArray()
      ]);

      setInspections(allInspections);
      setEquipments(allEquipments);
      setConflicts(allConflicts);
      setAuditLogs(allAudit);
      // Sort operations: PENDING first, then by timestamp descending
      const sortedOps = [...allOperations].sort((a, b) => {
        const statusOrder: Record<OperationStatus, number> = {
          PENDING: 1,
          SYNCING: 2,
          CONFLICT: 3,
          FAILED: 4,
          SYNCED: 5
        };
        const orderDiff = statusOrder[a.status] - statusOrder[b.status];
        if (orderDiff !== 0) return orderDiff;
        return (b.timestamp || '').localeCompare(a.timestamp || '');
      });
      setOperations(sortedOps);

      // Keep selectedInspection in sync if opened or restored from active session
      const savedActiveId = typeof window !== 'undefined' ? localStorage.getItem('wa1_active_inspection_id') : null;
      const targetId = selectedInspection?.id || savedActiveId;
      if (targetId) {
        const refreshedCurrent = allInspections.find(i => i.id === targetId);
        if (refreshedCurrent) setSelectedInspection(refreshedCurrent);
      }
    } catch (err) {
      console.error('Failed to load records from Dexie IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInspection]);

  useEffect(() => {
    refreshAllData();
  }, []);

  const logAuditEntry = async (action: string, targetType: AuditLog['targetType'], targetId: string, details: string) => {
    const newLog: AuditLog = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'usr-tech-01',
      userName: currentUser?.name || 'Technician A',
      userRole: currentUser?.role || 'TECHNICIAN',
      action,
      targetType,
      targetId,
      details,
      ipAddress: isOnline ? '10.200.4.15 (Synced Node)' : '192.168.10.42 (Offline Buffer)',
      hash: Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10)
    };
    await db.auditLogs.add(newLog);
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const createOperation = async (params: {
    entityId: string;
    entityName?: string;
    entityType: Operation['entityType'];
    field: string;
    oldValue: any;
    newValue: any;
    networkState?: OperationNetworkState;
    customOpId?: string;
    userId?: string;
    userName?: string;
  }): Promise<Operation> => {
    // Generate clean alphanumeric uppercase operation ID like OP-8F21A9
    const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const opId = params.customOpId || `OP-${hex}`;
    
    // Format timestamp like "09:40"
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${mins}`;

    const newOp: Operation = {
      operationId: opId,
      clientId: 'client-wa1-alpha',
      userId: params.userId || currentUser?.id || 'usr-tech-01',
      userName: params.userName || currentUser?.name || 'Technician A',
      entityId: params.entityId,
      entityName: params.entityName || 'Field Equipment',
      entityType: params.entityType,
      field: params.field,
      oldValue: String(params.oldValue ?? 'None'),
      newValue: String(params.newValue ?? 'None'),
      timestamp: timeStr,
      networkState: params.networkState || (isOnline ? 'ONLINE' : 'OFFLINE'),
      status: 'PENDING'
    };

    await db.operations.put(newOp);
    setOperations(prev => [newOp, ...prev.filter(o => o.operationId !== opId)]);
    return newOp;
  };

  const generateExampleOperation = async (): Promise<Operation> => {
    // Exact prompt specification:
    // Technician A
    // Fire Extinguisher #25
    // PASS → FAIL
    // 09:40
    // OFFLINE
    // Operation: OP-8F21A9
    // Status: PENDING
    const exampleOp: Operation = {
      operationId: 'OP-8F21A9',
      clientId: 'client-wa1-alpha',
      userId: 'usr-tech-01',
      userName: 'Technician A',
      entityId: 'insp-25',
      entityName: 'Fire Extinguisher #25',
      entityType: 'CHECKLIST_ITEM',
      field: 'Safety Seal',
      oldValue: 'PASS',
      newValue: 'FAIL',
      timestamp: '09:40',
      networkState: 'OFFLINE',
      status: 'PENDING'
    };

    await db.operations.put(exampleOp);
    setOperations(prev => [exampleOp, ...prev.filter(o => o.operationId !== exampleOp.operationId)]);
    return exampleOp;
  };

  const syncOperations = async (targetOperationIds?: string[]): Promise<{
    synced: number;
    failed: number;
    conflicts: number;
    message: string;
  }> => {
    if (!isOnline) {
      return {
        synced: 0,
        failed: 0,
        conflicts: 0,
        message: "You're offline. Your changes are safely stored on this device."
      };
    }

    const allOps = await db.operations.toArray();
    const candidateOps = allOps.filter(op => {
      if (targetOperationIds && targetOperationIds.length > 0) {
        return targetOperationIds.includes(op.operationId);
      }
      return op.status === 'PENDING' || op.status === 'FAILED';
    });

    if (candidateOps.length === 0) {
      return {
        synced: 0,
        failed: 0,
        conflicts: 0,
        message: "Queue clear: No pending changes to synchronize."
      };
    }

    // Mark as SYNCING in Dexie and memory
    const syncingOps = candidateOps.map(op => ({ ...op, status: 'SYNCING' as OperationStatus }));
    await db.operations.bulkPut(syncingOps);
    setOperations(prev => prev.map(op => {
      const match = syncingOps.find(s => s.operationId === op.operationId);
      return match ? match : op;
    }));

    try {
      // Send to server
      const res = await fetch('/api/sync/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: candidateOps })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const results: Array<{ operationId: string; status: OperationStatus; syncedAt?: string; errorMessage?: string; conflictDetails?: string }> = data.operations || [];

      // Update local records ONLY when backend confirms
      for (const resItem of results) {
        const existing = await db.operations.get(resItem.operationId);
        if (existing) {
          existing.status = resItem.status;
          if (resItem.status === 'SYNCED') {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            existing.syncedAt = resItem.syncedAt ? timeStr : timeStr;
            existing.errorMessage = undefined;
          } else if (resItem.status === 'FAILED') {
            existing.errorMessage = resItem.errorMessage || 'Backend rejected payload';
            existing.retryCount = (existing.retryCount || 0) + 1;
          } else if (resItem.status === 'CONFLICT') {
            existing.conflictDetails = resItem.conflictDetails || 'Concurrent conflict with central revision';
          }
          await db.operations.put(existing);
        }
      }

      await refreshAllData();

      return {
        synced: data.syncedCount || 0,
        failed: data.failedCount || 0,
        conflicts: data.conflictCount || 0,
        message: `Synchronization verified: ${data.syncedCount} confirmed SYNCED by backend node.`
      };
    } catch (err: any) {
      // Network failure: return back to FAILED or PENDING with message
      const failedOps = candidateOps.map(op => ({
        ...op,
        status: 'FAILED' as OperationStatus,
        errorMessage: err?.message || 'Network connection failed during sync',
        retryCount: (op.retryCount || 0) + 1
      }));
      await db.operations.bulkPut(failedOps);
      await refreshAllData();

      return {
        synced: 0,
        failed: candidateOps.length,
        conflicts: 0,
        message: `Sync failed: ${err?.message || 'Server unreachable'}. Changes remain stored locally in IndexedDB.`
      };
    }
  };

  const retryOperation = async (operationId: string) => {
    const op = await db.operations.get(operationId);
    if (!op) return;
    op.status = 'PENDING';
    op.errorMessage = undefined;
    await db.operations.put(op);
    setOperations(prev => prev.map(o => o.operationId === operationId ? { ...o, status: 'PENDING', errorMessage: undefined } : o));
    if (isOnline) {
      await syncOperations([operationId]);
    }
  };

  const resolveOperationConflict = async (operationId: string, resolution: 'KEEP_LOCAL' | 'ACCEPT_SERVER') => {
    const op = await db.operations.get(operationId);
    if (!op) return;
    if (resolution === 'KEEP_LOCAL') {
      op.status = 'PENDING';
      op.conflictDetails = undefined;
      await db.operations.put(op);
      if (isOnline) {
        await syncOperations([operationId]);
      }
    } else {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      op.status = 'SYNCED';
      op.syncedAt = timeStr;
      op.conflictDetails = undefined;
      await db.operations.put(op);
    }
    await refreshAllData();
  };

  const discardOperation = async (operationId: string) => {
    await db.operations.delete(operationId);
    setOperations(prev => prev.filter(o => o.operationId !== operationId));
  };

  const updateChecklistItem = async (
    inspectionId: string,
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => {
    const target = inspections.find(i => i.id === inspectionId);
    if (!target) return;

    let targetItem = target.checklist.find(i => i.id === itemId);
    const oldStatus = targetItem?.status || 'NOT_CHECKED';

    const updatedChecklist = target.checklist.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          ...updates,
          timestamp: new Date().toISOString()
        };
      }
      return item;
    });

    // Recompute score
    const passedCount = updatedChecklist.filter(i => i.status === 'PASS').length;
    const warningCount = updatedChecklist.filter(i => i.status === 'WARNING').length;
    const newScore = Math.round(((passedCount + warningCount * 0.5) / Math.max(1, updatedChecklist.length)) * 100);

    const updatedInsp: Inspection = {
      ...target,
      checklist: updatedChecklist,
      score: newScore,
      syncState: 'PENDING',
      offlineDraft: !isOnline,
      lastModified: new Date().toISOString(),
      version: target.version + 1
    };

    await db.inspections.put(updatedInsp);
    
    // Create operation record
    if (targetItem && updates.status && updates.status !== oldStatus) {
      await createOperation({
        entityId: target.id,
        entityName: target.equipmentName,
        entityType: 'CHECKLIST_ITEM',
        field: targetItem.title,
        oldValue: oldStatus,
        newValue: updates.status,
        networkState: isOnline ? 'ONLINE' : 'OFFLINE'
      });
    }

    await logAuditEntry('CHECKLIST_ITEM_UPDATED', 'INSPECTION', target.code, `Updated item ${itemId} to status: ${updates.status || 'notes modified'}`);
    await refreshAllData();
  };

  const addDefectToInspection = async (
    inspectionId: string,
    defect: Omit<Defect, 'id' | 'timestamp' | 'resolved'>
  ) => {
    const target = inspections.find(i => i.id === inspectionId);
    if (!target) return;

    const newDefect: Defect = {
      ...defect,
      id: 'def-' + Date.now(),
      timestamp: new Date().toISOString(),
      resolved: false
    };

    const updatedInsp: Inspection = {
      ...target,
      defects: [...target.defects, newDefect],
      riskLevel: defect.severity === 'CRITICAL' ? 'CRITICAL' : target.riskLevel,
      syncState: 'PENDING',
      offlineDraft: !isOnline,
      lastModified: new Date().toISOString()
    };

    await db.inspections.put(updatedInsp);

    // Create operation record for defect
    await createOperation({
      entityId: target.id,
      entityName: target.equipmentName,
      entityType: 'DEFECT',
      field: defect.title,
      oldValue: 'None',
      newValue: `Logged [${defect.severity}]: ${defect.title}`,
      networkState: isOnline ? 'ONLINE' : 'OFFLINE'
    });

    await logAuditEntry('DEFECT_LOGGED', 'INSPECTION', target.code, `Logged ${defect.severity} defect: "${defect.title}"`);
    await refreshAllData();
  };

  const changeInspectionStatus = async (inspectionId: string, newStatus: InspectionStatus) => {
    const target = inspections.find(i => i.id === inspectionId);
    if (!target) return;

    const oldStatus = target.status;

    const updatedInsp: Inspection = {
      ...target,
      status: newStatus,
      syncState: 'PENDING',
      offlineDraft: !isOnline,
      lastModified: new Date().toISOString(),
      version: target.version + 1
    };

    await db.inspections.put(updatedInsp);

    // Create operation record
    await createOperation({
      entityId: target.id,
      entityName: target.equipmentName,
      entityType: 'INSPECTION',
      field: 'Inspection Status',
      oldValue: oldStatus,
      newValue: newStatus,
      networkState: isOnline ? 'ONLINE' : 'OFFLINE'
    });

    await logAuditEntry('STATUS_CHANGED', 'INSPECTION', target.code, `Status updated from ${target.status} to ${newStatus}`);
    await refreshAllData();
  };

  const resolveConflictItem = async (conflictId: string, resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MANUAL_MERGE') => {
    const target = conflicts.find(c => c.id === conflictId);
    if (!target) return;

    await db.conflicts.delete(conflictId);
    await logAuditEntry('CONFLICT_RESOLVED', 'INSPECTION', target.inspectionCode, `Conflict ${conflictId} resolved via ${resolution}`);
    await refreshAllData();
  };

  const createNewInspection = async (data: {
    title: string;
    equipmentId: string;
    scheduledDate: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }) => {
    const targetEq = equipments.find(e => e.id === data.equipmentId) || equipments[0];
    const newCode = `INS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newId = `insp-${Date.now()}`;

    const newInsp: Inspection = {
      id: newId,
      code: newCode,
      title: data.title,
      equipmentId: targetEq.id,
      equipmentName: targetEq.name,
      facility: targetEq.facility,
      zone: targetEq.location,
      assignedTechnicianId: currentUser?.id || 'usr-tech-01',
      technicianName: currentUser?.name || 'Technician A',
      status: 'IN_PROGRESS',
      syncState: 'PENDING',
      riskLevel: data.riskLevel,
      score: 100,
      scheduledDate: data.scheduledDate,
      offlineDraft: true,
      version: 1,
      lastModified: new Date().toISOString(),
      checklist: [
        {
          id: 'chk-1',
          category: 'Mechanical Integrity',
          title: 'Structural Mounting & Fasteners',
          requirement: 'All anchor bolts, fasteners, and bracket clamps tight without oxidation',
          status: 'NOT_CHECKED'
        },
        {
          id: 'chk-2',
          category: 'Safety Systems',
          title: 'Emergency Shutoff & Interlocks',
          requirement: 'Secondary trip mechanism activates cleanly and returns to home position',
          status: 'NOT_CHECKED'
        },
        {
          id: 'chk-3',
          category: 'Fluid / Electrical',
          title: 'Leakage & Seal Integrity',
          requirement: 'No fluid dripping, pressure drop, or insulation breakdown detected',
          status: 'NOT_CHECKED'
        }
      ],
      defects: []
    };

    await db.inspections.add(newInsp);

    await createOperation({
      entityId: newInsp.id,
      entityName: newInsp.equipmentName,
      entityType: 'INSPECTION',
      field: 'New Inspection Schedule',
      oldValue: 'None',
      newValue: newInsp.title,
      networkState: isOnline ? 'ONLINE' : 'OFFLINE'
    });

    await logAuditEntry('INSPECTION_CREATED', 'INSPECTION', newCode, `Created new inspection schedule for equipment ${targetEq.name}`);
    await refreshAllData();
    return newInsp;
  };

  const saveInspection = async (updatedInspection: Inspection) => {
    // Recompute score based on checklist
    const checklist = updatedInspection.checklist || [];
    const passedCount = checklist.filter(i => i.status === 'PASS').length;
    const warningCount = checklist.filter(i => i.status === 'WARNING').length;
    const newScore = checklist.length > 0
      ? Math.round(((passedCount + warningCount * 0.5) / checklist.length) * 100)
      : updatedInspection.score;

    // Strict requirement: Structure the application for IndexedDB/Dexie and do not claim data is synced yet
    const payload: Inspection = {
      ...updatedInspection,
      score: newScore,
      syncState: 'PENDING',
      offlineDraft: true,
      lastModified: new Date().toISOString(),
      version: (updatedInspection.version || 1) + 1
    };

    // 1. Primary Inspection record in Dexie
    await db.inspections.put(payload);

    // 2. Normalized Checklist Items in Dexie
    if (payload.checklist && payload.checklist.length > 0) {
      const itemsToPut: ChecklistItemRecord[] = payload.checklist.map((chk, idx) => ({
        id: `${payload.id}-${chk.id || idx}`,
        inspectionId: payload.id,
        category: chk.category || 'General Integrity',
        title: chk.title,
        requirement: chk.requirement || '',
        status: chk.status,
        notes: chk.notes,
        measuredValue: chk.measuredValue,
        toleranceRange: chk.toleranceRange,
        failReason: chk.failReason,
        failNotes: chk.failNotes,
        failSeverity: chk.failSeverity,
        evidencePhotoUrl: chk.evidencePhotoUrl,
        evidenceDescription: chk.evidenceDescription,
        timestamp: chk.timestamp || new Date().toISOString(),
        syncState: 'PENDING'
      }));
      await db.inspectionItems.bulkPut(itemsToPut);
    }

    // 3. Notes record in Dexie
    if (payload.generalNotes && payload.generalNotes.trim().length > 0) {
      const noteRecord: InspectionNoteRecord = {
        id: `note-${payload.id}`,
        inspectionId: payload.id,
        content: payload.generalNotes,
        authorId: currentUser?.id || payload.assignedTechnicianId,
        authorName: currentUser?.name || payload.technicianName,
        category: 'GENERAL',
        timestamp: new Date().toISOString(),
        syncState: 'PENDING'
      };
      await db.notes.put(noteRecord);
    }

    // 4. Evidence Metadata records in Dexie
    if (payload.evidencePhotos && payload.evidencePhotos.length > 0) {
      const evidenceRecords: EvidenceMetadataRecord[] = payload.evidencePhotos.map((photo) => ({
        id: photo.id,
        inspectionId: payload.id,
        caption: photo.description || 'Inspection photo evidence',
        filename: `${photo.id}.jpg`,
        dataUrl: photo.url,
        mimeType: 'image/jpeg',
        sizeBytes: photo.url ? Math.round(photo.url.length * 0.75) : 0,
        capturedAt: photo.timestamp || new Date().toISOString(),
        gpsLat: payload.gpsLocation?.latitude,
        gpsLng: payload.gpsLocation?.longitude,
        gpsAccuracy: payload.gpsLocation?.accuracy,
        syncState: 'PENDING'
      }));
      await db.evidenceMetadata.bulkPut(evidenceRecords);
    }

    // 5. Enqueue Pending Operation in Dexie
    const pendingOp: PendingOperationRecord = {
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'UPDATE_INSPECTION',
      entityId: payload.id,
      entityType: 'INSPECTION',
      payload: {
        code: payload.code,
        equipmentName: payload.equipmentName,
        status: payload.status,
        score: payload.score,
        checklistCount: (payload.checklist || []).length,
        notesLength: (payload.generalNotes || '').length,
        evidenceCount: (payload.evidencePhotos || []).length
      },
      timestamp: new Date().toISOString(),
      status: 'QUEUED',
      retryCount: 0
    };
    await db.pendingOperations.add(pendingOp);

    // 6. Create operation record in db.operations
    await createOperation({
      entityId: payload.id,
      entityName: payload.equipmentName,
      entityType: 'INSPECTION',
      field: 'Inspection Master Audit',
      oldValue: `Score ${updatedInspection.score}%`,
      newValue: `Score ${payload.score}% (v${payload.version})`,
      networkState: isOnline ? 'ONLINE' : 'OFFLINE'
    });

    // 7. Record Sync Status tracker in Dexie
    const syncStatusRecord: SyncStatusRecord = {
      id: `sync-${payload.id}`,
      entityType: 'INSPECTION',
      entityId: payload.id,
      status: 'PENDING',
      pendingChangesCount: 1,
      lastAttemptAt: new Date().toISOString()
    };
    await db.syncStatus.put(syncStatusRecord);

    // 8. Persist active inspection ID for clean page reloads
    if (typeof window !== 'undefined') {
      localStorage.setItem('wa1_active_inspection_id', payload.id);
    }

    await logAuditEntry(
      'INSPECTION_SAVED_LOCAL',
      'INSPECTION',
      payload.code,
      `Saved inspection for ${payload.equipmentName} locally. Sync State: PENDING (IndexedDB).`
    );
    await refreshAllData();
    setSelectedInspection(payload);
  };

  return (
    <InspectionContext.Provider
      value={{
        inspections,
        equipments,
        conflicts,
        auditLogs,
        operations,
        isLoading,
        selectedInspection,
        setSelectedInspection,
        updateChecklistItem,
        addDefectToInspection,
        changeInspectionStatus,
        resolveConflictItem,
        createNewInspection,
        saveInspection,
        createOperation,
        syncOperations,
        retryOperation,
        resolveOperationConflict,
        discardOperation,
        generateExampleOperation,
        logAuditEntry,
        refreshAllData
      }}
    >
      {children}
    </InspectionContext.Provider>
  );
};

export function useInspections() {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error('useInspections must be used within an InspectionProvider');
  }
  return context;
}


    const updatedInsp: Inspection = {
      ...target,
      status: newStatus,
      completedDate: (newStatus === 'PASSED' || newStatus === 'FAILED') ? new Date().toISOString() : target.completedDate,
      syncState: isOnline ? 'SYNCED' : 'PENDING',
      offlineDraft: !isOnline,
      lastModified: new Date().toISOString()
    };

    if (currentUser?.role === 'SUPERVISOR' && (newStatus === 'PASSED' || newStatus === 'FAILED')) {
      updatedInsp.signatures = {
        ...updatedInsp.signatures,
        supervisor: { name: currentUser.name, timestamp: new Date().toISOString() }
      };
    } else if (currentUser?.role === 'TECHNICIAN' && newStatus === 'PENDING_REVIEW') {
      updatedInsp.signatures = {
        ...updatedInsp.signatures,
        technician: { name: currentUser.name, timestamp: new Date().toISOString() }
      };
    }

    await db.inspections.put(updatedInsp);
    await logAuditEntry('STATUS_CHANGED', 'INSPECTION', target.code, `Inspection status transitioned from ${target.status} to ${newStatus}`);
    await refreshAllData();
  };

  const resolveConflictItem = async (
    conflictId: string,
    resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MANUAL_MERGE'
  ) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    await db.conflicts.update(conflictId, {
      status: 'RESOLVED',
      resolution
    });

    const insp = inspections.find(i => i.id === conflict.inspectionId);
    if (insp) {
      await db.inspections.update(insp.id, {
        status: 'IN_PROGRESS',
        syncState: 'SYNCED',
        lastModified: new Date().toISOString()
      });
    }

    await logAuditEntry('CRDT_CONFLICT_RESOLVED', 'CONFLICT', conflictId, `Resolved conflict on ${conflict.inspectionCode} with resolution policy: ${resolution}`);
    await refreshAllData();
  };

  const createNewInspection = async (data: {
    title: string;
    equipmentId: string;
    scheduledDate: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): Promise<Inspection> => {
    const targetEq = equipments.find(e => e.id === data.equipmentId) || equipments[0];
    const newCode = `INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInsp: Inspection = {
      id: 'insp-' + Date.now(),
      code: newCode,
      title: data.title,
      equipmentId: targetEq.id,
      equipmentName: targetEq.name,
      facility: targetEq.facility,
      zone: targetEq.location,
      assignedTechnicianId: currentUser?.id || 'usr-tech-01',
      technicianName: currentUser?.name || 'Alex Vance',
      status: 'IN_PROGRESS',
      syncState: isOnline ? 'SYNCED' : 'PENDING',
      riskLevel: data.riskLevel,
      score: 0,
      scheduledDate: data.scheduledDate,
      offlineDraft: !isOnline,
      version: 1,
      lastModified: new Date().toISOString(),
      checklist: [
        {
          id: 'chk-new-1',
          category: 'Visual & Environmental',
          title: 'Perimeter Hazard & Foreign Object Debris',
          requirement: 'Enclosure must be free of oil leaks, loose hardware, or thermal burn marks.',
          status: 'NOT_CHECKED',
          toleranceRange: 'Zero debris'
        },
        {
          id: 'chk-new-2',
          category: 'Mechanical Verification',
          title: 'Shaft Alignment & Coupling Tolerance',
          requirement: 'Laser alignment angular variance under 0.05 mm/100mm.',
          status: 'NOT_CHECKED',
          toleranceRange: '< 0.05 mm'
        },
        {
          id: 'chk-new-3',
          category: 'Electrical & Grounding',
          title: 'Equipotential Ground Bond Resistance',
          requirement: 'Substation ground conductor resistance must be under 0.10 Ohm.',
          status: 'NOT_CHECKED',
          toleranceRange: '< 0.10 Ohm'
        },
        {
          id: 'chk-new-4',
          category: 'Emergency Safety',
          title: 'Dead-Man & Remote Trip Breaker Test',
          requirement: 'Auxiliary trip trigger activates in under 120ms without mechanical bounce.',
          status: 'NOT_CHECKED',
          toleranceRange: '< 120ms'
        }
      ],
      defects: [],
      signatures: {
        technician: { name: currentUser?.name || 'Alex Vance', timestamp: new Date().toISOString() }
      }
    };

    await db.inspections.add(newInsp);
    await logAuditEntry('INSPECTION_CREATED', 'INSPECTION', newCode, `Created new inspection schedule for equipment ${targetEq.name}`);
    await refreshAllData();
    return newInsp;
  };

  const saveInspection = async (updatedInspection: Inspection) => {
    // Recompute score based on checklist
    const checklist = updatedInspection.checklist || [];
    const passedCount = checklist.filter(i => i.status === 'PASS').length;
    const warningCount = checklist.filter(i => i.status === 'WARNING').length;
    const newScore = checklist.length > 0
      ? Math.round(((passedCount + warningCount * 0.5) / checklist.length) * 100)
      : updatedInspection.score;

    // Strict requirement: Structure the application for IndexedDB/Dexie and do not claim data is synced yet
    const payload: Inspection = {
      ...updatedInspection,
      score: newScore,
      syncState: 'PENDING',
      offlineDraft: true,
      lastModified: new Date().toISOString(),
      version: (updatedInspection.version || 1) + 1
    };

    // 1. Primary Inspection record in Dexie
    await db.inspections.put(payload);

    // 2. Normalized Checklist Items in Dexie
    if (payload.checklist && payload.checklist.length > 0) {
      const itemsToPut: ChecklistItemRecord[] = payload.checklist.map((chk, idx) => ({
        id: `${payload.id}-${chk.id || idx}`,
        inspectionId: payload.id,
        category: chk.category || 'General Integrity',
        title: chk.title,
        requirement: chk.requirement || '',
        status: chk.status,
        notes: chk.notes,
        measuredValue: chk.measuredValue,
        toleranceRange: chk.toleranceRange,
        failReason: chk.failReason,
        failNotes: chk.failNotes,
        failSeverity: chk.failSeverity,
        evidencePhotoUrl: chk.evidencePhotoUrl,
        evidenceDescription: chk.evidenceDescription,
        timestamp: chk.timestamp || new Date().toISOString(),
        syncState: 'PENDING'
      }));
      await db.inspectionItems.bulkPut(itemsToPut);
    }

    // 3. Notes record in Dexie
    if (payload.generalNotes && payload.generalNotes.trim().length > 0) {
      const noteRecord: InspectionNoteRecord = {
        id: `note-${payload.id}`,
        inspectionId: payload.id,
        content: payload.generalNotes,
        authorId: currentUser?.id || payload.assignedTechnicianId,
        authorName: currentUser?.name || payload.technicianName,
        category: 'GENERAL',
        timestamp: new Date().toISOString(),
        syncState: 'PENDING'
      };
      await db.notes.put(noteRecord);
    }

    // 4. Evidence Metadata records in Dexie
    if (payload.evidencePhotos && payload.evidencePhotos.length > 0) {
      const evidenceRecords: EvidenceMetadataRecord[] = payload.evidencePhotos.map((photo) => ({
        id: photo.id,
        inspectionId: payload.id,
        caption: photo.description || 'Inspection photo evidence',
        filename: `${photo.id}.jpg`,
        dataUrl: photo.url,
        mimeType: 'image/jpeg',
        sizeBytes: photo.url ? Math.round(photo.url.length * 0.75) : 0,
        capturedAt: photo.timestamp || new Date().toISOString(),
        gpsLat: payload.gpsLocation?.latitude,
        gpsLng: payload.gpsLocation?.longitude,
        gpsAccuracy: payload.gpsLocation?.accuracy,
        syncState: 'PENDING'
      }));
      await db.evidenceMetadata.bulkPut(evidenceRecords);
    }

    // 5. Enqueue Pending Operation in Dexie
    const pendingOp: PendingOperationRecord = {
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'UPDATE_INSPECTION',
      entityId: payload.id,
      entityType: 'INSPECTION',
      payload: {
        code: payload.code,
        equipmentName: payload.equipmentName,
        status: payload.status,
        score: payload.score,
        checklistCount: (payload.checklist || []).length,
        notesLength: (payload.generalNotes || '').length,
        evidenceCount: (payload.evidencePhotos || []).length
      },
      timestamp: new Date().toISOString(),
      status: 'QUEUED',
      retryCount: 0
    };
    await db.pendingOperations.add(pendingOp);

    // 6. Record Sync Status tracker in Dexie
    const syncStatusRecord: SyncStatusRecord = {
      id: `sync-${payload.id}`,
      entityType: 'INSPECTION',
      entityId: payload.id,
      status: 'PENDING',
      pendingChangesCount: 1,
      lastAttemptAt: new Date().toISOString()
    };
    await db.syncStatus.put(syncStatusRecord);

    // 7. Persist active inspection ID for clean page reloads
    if (typeof window !== 'undefined') {
      localStorage.setItem('wa1_active_inspection_id', payload.id);
    }

    await logAuditEntry(
      'INSPECTION_SAVED_LOCAL',
      'INSPECTION',
      payload.code,
      `Saved inspection for ${payload.equipmentName} locally. Sync State: PENDING (IndexedDB).`
    );
    await refreshAllData();
    setSelectedInspection(payload);
  };

  return (
    <InspectionContext.Provider
      value={{
        inspections,
        equipments,
        conflicts,
        auditLogs,
        isLoading,
        selectedInspection,
        setSelectedInspection,
        updateChecklistItem,
        addDefectToInspection,
        changeInspectionStatus,
        resolveConflictItem,
        createNewInspection,
        saveInspection,
        logAuditEntry,
        refreshAllData
      }}
    >
      {children}
    </InspectionContext.Provider>
  );
};

export function useInspections() {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error('useInspections must be used within an InspectionProvider');
  }
  return context;
}
