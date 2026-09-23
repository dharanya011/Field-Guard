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
  SyncStatusRecord
} from '../types';
import { db, initDatabase } from '../db/offlineDb';
import { useAuth } from './AuthContext';
import { useNetwork } from './NetworkContext';
import { crdtManager } from '../services/crdtService';
import { ApiClient } from '../services/api';

interface InspectionContextType {
  inspections: Inspection[];
  equipments: Equipment[];
  conflicts: ConflictItem[];
  auditLogs: AuditLog[];
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
  resolveConflictItem: (conflictId: string, resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MANUAL_MERGE', manualValue?: string, manualNotes?: string) => Promise<void>;
  createNewInspection: (data: {
    title: string;
    equipmentId: string;
    scheduledDate: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }) => Promise<Inspection>;
  saveInspection: (updatedInspection: Inspection) => Promise<void>;
  deleteInspection: (inspectionId: string) => Promise<void>;
  createEquipment: (data: Partial<Equipment>) => Promise<Equipment>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<Equipment>;
  deleteEquipment: (id: string) => Promise<void>;
  logAuditEntry: (action: string, targetType: AuditLog['targetType'], targetId: string, details: string) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

export const InspectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { isOnline, triggerManualSync } = useNetwork();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const refreshAllData = useCallback(async () => {
    try {
      await initDatabase();
      const [allInspections, allEquipments, allConflicts, allAudit] = await Promise.all([
        db.inspections.toArray(),
        db.equipment.toArray(),
        db.conflicts.toArray(),
        db.auditLogs.reverse().sortBy('timestamp')
      ]);

      setInspections(allInspections);
      setEquipments(allEquipments);
      setConflicts(allConflicts);
      setAuditLogs(allAudit);

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
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Field System',
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

  const updateChecklistItem = async (
    inspectionId: string,
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => {
    const target = inspections.find(i => i.id === inspectionId);
    if (!target) return;

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
      offlineDraft: true,
      lastModified: new Date().toISOString(),
      version: target.version + 1
    };

    await db.inspections.put(updatedInsp);
    const doc1 = crdtManager.getOrCreateDoc(inspectionId, updatedInsp);
    const crdtUpdate1 = crdtManager.encodeDocState(doc1);

    await db.pendingOperations.add({
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'UPDATE_CHECKLIST',
      entityId: inspectionId,
      entityType: 'INSPECTION',
      payload: { itemId, updates },
      timestamp: new Date().toISOString(),
      status: 'QUEUED',
      retryCount: 0,
      clientId: crdtManager.getClientId(),
      operationId: `crdt-op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      version: updatedInsp.version,
      crdtUpdate: crdtUpdate1
    });

    await logAuditEntry('CHECKLIST_ITEM_UPDATED', 'INSPECTION', target.code, `Updated item ${itemId} to status: ${updates.status || 'notes modified'}`);
    await refreshAllData();

    if (isOnline) {
      triggerManualSync();
    }
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
      offlineDraft: true,
      lastModified: new Date().toISOString()
    };

    await db.inspections.put(updatedInsp);
    const docDefect = crdtManager.getOrCreateDoc(inspectionId, updatedInsp);
    const crdtUpdateDefect = crdtManager.encodeDocState(docDefect);

    await db.pendingOperations.add({
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'ADD_DEFECT',
      entityId: inspectionId,
      entityType: 'INSPECTION',
      payload: { defect: newDefect },
      timestamp: new Date().toISOString(),
      status: 'QUEUED',
      retryCount: 0,
      clientId: crdtManager.getClientId(),
      operationId: `crdt-op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      version: updatedInsp.version,
      crdtUpdate: crdtUpdateDefect
    });

    await logAuditEntry('DEFECT_LOGGED', 'INSPECTION', target.code, `Logged ${defect.severity} defect: "${defect.title}"`);
    await refreshAllData();

    if (isOnline) {
      triggerManualSync();
    }
  };

  const changeInspectionStatus = async (inspectionId: string, newStatus: InspectionStatus) => {
    const target = inspections.find(i => i.id === inspectionId);
    if (!target) return;

    const updatedInsp: Inspection = {
      ...target,
      status: newStatus,
      completedDate: (newStatus === 'PASSED' || newStatus === 'FAILED') ? new Date().toISOString() : target.completedDate,
      syncState: 'PENDING',
      offlineDraft: true,
      lastModified: new Date().toISOString()
    };

    if (currentUser?.role === 'SUPERVISOR' && (newStatus === 'PASSED' || newStatus === 'FAILED')) {
      updatedInsp.signatures = {
        ...updatedInsp.signatures,
        supervisor: { name: currentUser?.name || 'Authorized Supervisor', timestamp: new Date().toISOString() }
      };
    } else if (currentUser?.role === 'TECHNICIAN' && newStatus === 'PENDING_REVIEW') {
      updatedInsp.signatures = {
        ...updatedInsp.signatures,
        technician: { name: currentUser?.name || 'Authorized Technician', timestamp: new Date().toISOString() }
      };
    }

    await db.inspections.put(updatedInsp);
    const docStatus = crdtManager.getOrCreateDoc(inspectionId, updatedInsp);
    const crdtUpdateStatus = crdtManager.encodeDocState(docStatus);

    await db.pendingOperations.add({
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'CHANGE_STATUS',
      entityId: inspectionId,
      entityType: 'INSPECTION',
      payload: { status: newStatus },
      timestamp: new Date().toISOString(),
      status: 'QUEUED',
      retryCount: 0,
      clientId: crdtManager.getClientId(),
      operationId: `crdt-op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      version: updatedInsp.version,
      crdtUpdate: crdtUpdateStatus
    });

    await logAuditEntry('STATUS_CHANGED', 'INSPECTION', target.code, `Inspection status transitioned from ${target.status} to ${newStatus}`);
    await refreshAllData();

    if (isOnline) {
      triggerManualSync();
    }
  };

  const resolveConflictItem = async (
    conflictId: string,
    resolution: 'USE_LOCAL' | 'USE_SERVER' | 'MANUAL_MERGE',
    manualValue?: string,
    manualNotes?: string
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

    const resolverName = currentUser?.name || 'Supervisor';
    const winningVal = resolution === 'USE_LOCAL' 
      ? conflict.localValue 
      : resolution === 'USE_SERVER' 
        ? conflict.serverValue 
        : (manualValue || 'Manual Supervisor Override');

    const auditRecord: AuditLog = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id || 'usr-sup-01',
      userName: resolverName,
      userRole: currentUser?.role || 'SUPERVISOR',
      action: 'SUPERVISOR_CONFLICT_RESOLVED',
      targetType: 'CONFLICT',
      targetId: conflictId,
      entityId: conflict.checklistItemId || conflict.inspectionId,
      operationId: `op-res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      details: `Supervisor resolved conflict on ${conflict.equipmentName} (${conflict.inspectionCode}): Policy [${resolution}] -> Value: "${winningVal}". ${manualNotes ? `Notes: "${manualNotes}"` : ''}`,
      ipAddress: isOnline ? '10.200.4.15 (Supervisor Console)' : '192.168.10.42 (Field Buffer)',
      hash: Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10),
      networkState: isOnline ? 'ONLINE' : 'OFFLINE',
      previousValue: `A: "${conflict.localValue}" | B: "${conflict.serverValue}"`,
      newValue: winningVal,
      conflictStatus: 'RESOLVED',
      resolver: resolverName,
      resolutionTime: new Date().toISOString(),
      evidence: conflict.localEvidence || conflict.remoteEvidence
    };

    await db.auditLogs.add(auditRecord);
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
      syncState: 'PENDING',
      riskLevel: data.riskLevel,
      score: 0,
      scheduledDate: data.scheduledDate,
      offlineDraft: true,
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
    const docNew = crdtManager.getOrCreateDoc(newInsp.id, newInsp);
    const crdtUpdateNew = crdtManager.encodeDocState(docNew);

    await db.pendingOperations.add({
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'CREATE_INSPECTION',
      entityId: newInsp.id,
      entityType: 'INSPECTION',
      payload: newInsp as unknown as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      status: 'QUEUED',
      retryCount: 0,
      clientId: crdtManager.getClientId(),
      operationId: `crdt-op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      version: newInsp.version,
      crdtUpdate: crdtUpdateNew
    });

    await logAuditEntry('INSPECTION_CREATED', 'INSPECTION', newCode, `Created new inspection schedule for equipment ${targetEq.name}`);
    await refreshAllData();

    if (isOnline) {
      triggerManualSync();
    }

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
    const docSave = crdtManager.getOrCreateDoc(payload.id, payload);
    const crdtUpdateSave = crdtManager.encodeDocState(docSave);

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
      retryCount: 0,
      clientId: crdtManager.getClientId(),
      operationId: `crdt-op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      version: payload.version,
      crdtUpdate: crdtUpdateSave
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

    if (isOnline) {
      triggerManualSync();
    }
  };

  const deleteInspection = async (inspectionId: string) => {
    await db.inspections.delete(inspectionId);
    if (selectedInspection?.id === inspectionId) {
      setSelectedInspection(null);
    }
    if (isOnline) {
      try {
        await ApiClient.request(`/api/inspections/${inspectionId}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Backend delete notification skipped/failed:', e);
      }
    }
    await logAuditEntry('INSPECTION_DELETED', 'INSPECTION', inspectionId, `Removed inspection ${inspectionId} from database.`);
    await refreshAllData();
  };

  const createEquipment = async (data: Partial<Equipment>): Promise<Equipment> => {
    const id = data.id || `eq-${Date.now()}`;
    const newEq: Equipment = {
      id,
      tag: data.tag || `TAG-${Math.floor(100 + Math.random() * 900)}`,
      name: data.name || 'New Industrial Asset',
      category: data.category || 'General Equipment',
      facility: data.facility || 'Alpha Energy Sector 4',
      location: data.location || 'Bay 1',
      status: data.status || 'OPERATIONAL',
      lastInspectionDate: data.lastInspectionDate || new Date().toISOString().split('T')[0],
      nextScheduledDate: data.nextScheduledDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      healthScore: data.healthScore ?? 100,
      criticality: data.criticality || 'MEDIUM',
      manufactureYear: data.manufactureYear || new Date().getFullYear() - 2
    };

    await db.equipment.put(newEq);

    if (isOnline) {
      try {
        await ApiClient.createEquipment(newEq as any);
      } catch (e) {
        console.warn('Backend equipment sync deferred:', e);
      }
    }

    await logAuditEntry('EQUIPMENT_REGISTERED', 'EQUIPMENT', id, `Registered new asset ${newEq.name} (${newEq.tag})`);
    await refreshAllData();
    return newEq;
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>): Promise<Equipment> => {
    const existing = await db.equipment.get(id);
    const updated = {
      ...(existing || {}),
      ...updates,
      id
    } as Equipment;

    await db.equipment.put(updated);

    if (isOnline) {
      try {
        await ApiClient.updateEquipment(id, updates as any);
      } catch (e) {
        console.warn('Backend equipment update deferred:', e);
      }
    }

    await logAuditEntry('EQUIPMENT_UPDATED', 'EQUIPMENT', id, `Updated asset ${updated.name}`);
    await refreshAllData();
    return updated;
  };

  const deleteEquipment = async (id: string) => {
    await db.equipment.delete(id);
    if (isOnline) {
      try {
        await ApiClient.deleteEquipment(id);
      } catch (e) {
        console.warn('Backend equipment delete deferred:', e);
      }
    }
    await logAuditEntry('EQUIPMENT_DELETED', 'EQUIPMENT', id, `Deleted asset ${id}`);
    await refreshAllData();
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
        deleteInspection,
        createEquipment,
        updateEquipment,
        deleteEquipment,
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
