import { REGISTERED_USERS, ROLE_PERMISSIONS, type UserRole, type UserPermissions } from '../auth';

export interface DBUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  title: string;
  badgeNumber: string;
  certificationLevel: string;
  avatar: string;
  createdAt: string;
}

export interface DBRole {
  id: string;
  roleName: UserRole;
  description: string;
  permissions: UserPermissions;
}

export interface DBEquipment {
  id: string;
  tag: string;
  name: string;
  category: string;
  facility: string;
  location: string;
  status: string;
  lastInspectionDate: string;
  nextScheduledDate: string;
  healthScore: number;
  criticality: string;
  createdAt: string;
}

export interface DBTask {
  id: string;
  title: string;
  equipmentId: string;
  equipmentName: string;
  assignedTechnicianId: string;
  technicianName: string;
  priority: string;
  status: string;
  dueDate: string;
  instructions: string;
  createdAt: string;
}

export interface DBChecklistItem {
  id: string;
  inspectionId: string;
  category: string;
  title: string;
  requirement?: string;
  status: string;
  measuredValue?: string;
  toleranceRange?: string;
  notes?: string;
  failReason?: string;
  failNotes?: string;
  failSeverity?: string;
  evidencePhotoUrl?: string;
  evidenceDescription?: string;
  timestamp: string;
}

export interface DBDefect {
  id: string;
  inspectionId: string;
  severity: string;
  title: string;
  description: string;
  recommendedAction: string;
  timestamp: string;
  resolved: boolean;
}

export interface DBInspection {
  id: string;
  code: string;
  title: string;
  equipmentId: string;
  equipmentName: string;
  facility: string;
  zone: string;
  assignedTechnicianId: string;
  technicianName: string;
  supervisorId?: string;
  supervisorName?: string;
  status: string;
  syncState: string;
  riskLevel: string;
  score: number;
  scheduledDate: string;
  completedDate?: string;
  offlineDraft: boolean;
  version: number;
  generalNotes?: string;
  signatures?: Record<string, { name: string; timestamp: string }>;
  gpsLocation?: { latitude: number; longitude: number; accuracy?: number };
  createdAt: string;
  updatedAt: string;
  checklist: DBChecklistItem[];
  defects: DBDefect[];
}

export interface DBSyncOperation {
  id: string;
  operationType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  clientTimestamp: string;
  serverTimestamp: string;
  status: string;
  clientId?: string;
  userId?: string;
}

export interface DBConflict {
  id: string;
  inspectionId: string;
  inspectionCode: string;
  equipmentName: string;
  field: string;
  localValue: string;
  serverValue: string;
  detectedAt: string;
  technicianName: string;
  supervisorName?: string;
  status: 'ACTIVE' | 'RESOLVED';
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionPolicy?: string;
  winningValue?: string;
  notes?: string;
}

export interface DBAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  hash: string;
}

export interface DBMediaUpload {
  id: string;
  uploadId: string;
  inspectionId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: number;
  storagePath?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  chunks: Map<number, string>;
}

export interface DBAIAnalysis {
  id: string;
  inspectionId: string;
  category: string;
  summary: string;
  anomalyScore: number;
  recommendedAction: string;
  generatedAt: string;
}

export interface DBNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

class RelationalDatabaseStore {
  private usersMap = new Map<string, DBUser>();
  private rolesMap = new Map<string, DBRole>();
  private equipmentMap = new Map<string, DBEquipment>();
  private tasksMap = new Map<string, DBTask>();
  private inspectionsMap = new Map<string, DBInspection>();
  private syncOpsList: DBSyncOperation[] = [];
  private conflictsMap = new Map<string, DBConflict>();
  private auditHistoryList: DBAuditEntry[] = [];
  private mediaUploadsMap = new Map<string, DBMediaUpload>();
  private aiAnalysisMap = new Map<string, DBAIAnalysis>();
  private notificationsList: DBNotification[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Roles
    const roles: DBRole[] = [
      { id: 'role-tech', roleName: 'TECHNICIAN', description: 'Field Specialist executing inspections', permissions: ROLE_PERMISSIONS.TECHNICIAN },
      { id: 'role-sup', roleName: 'SUPERVISOR', description: 'Regional Director approving & resolving conflicts', permissions: ROLE_PERMISSIONS.SUPERVISOR },
      { id: 'role-adm', roleName: 'ADMIN', description: 'Chief Reliability Administrator managing users & security', permissions: ROLE_PERMISSIONS.ADMIN }
    ];
    roles.forEach(r => this.rolesMap.set(r.id, r));

    // 2. Users
    REGISTERED_USERS.forEach(u => {
      this.usersMap.set(u.id, {
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        name: u.name,
        role: u.role,
        title: u.title,
        badgeNumber: u.badgeNumber,
        certificationLevel: u.certificationLevel,
        avatar: u.avatar,
        createdAt: new Date().toISOString()
      });
    });

    // 3. Equipment
    const equipments: DBEquipment[] = [
      {
        id: 'eq-01',
        tag: 'TURB-GEN-400A',
        name: 'Main Turbine Generator T-400',
        category: 'Power Generation',
        facility: 'Alpha Energy Sector 4',
        location: 'Bay 12 - Substation 03',
        status: 'OPERATIONAL',
        lastInspectionDate: '2026-09-18',
        nextScheduledDate: '2026-09-25',
        healthScore: 94,
        criticality: 'HIGH',
        createdAt: new Date().toISOString()
      },
      {
        id: 'eq-02',
        tag: 'BLR-HP-012',
        name: 'High-Pressure Steam Boiler B-12',
        category: 'Thermal Vessel',
        facility: 'Alpha Energy Sector 4',
        location: 'Thermal Plant North',
        status: 'NEEDS_MAINTENANCE',
        lastInspectionDate: '2026-09-20',
        nextScheduledDate: '2026-09-22',
        healthScore: 71,
        criticality: 'HIGH',
        createdAt: new Date().toISOString()
      },
      {
        id: 'eq-03',
        tag: 'VALVE-CRYO-088',
        name: 'Emergency Cryogenic Relief Valve RV-88',
        category: 'Safety Systems',
        facility: 'Cryo Terminal East',
        location: 'Storage Sphere #4',
        status: 'CRITICAL_OFFLINE',
        lastInspectionDate: '2026-09-21',
        nextScheduledDate: '2026-09-22',
        healthScore: 42,
        criticality: 'HIGH',
        createdAt: new Date().toISOString()
      }
    ];
    equipments.forEach(e => this.equipmentMap.set(e.id, e));

    // 4. Initial Inspections
    const initialInspections: DBInspection[] = [
      {
        id: 'insp-101',
        code: 'INS-2026-0891',
        title: 'High-Pressure Safety & Valve Tolerance Audit',
        equipmentId: 'eq-02',
        equipmentName: 'High-Pressure Steam Boiler B-12',
        facility: 'Alpha Energy Sector 4',
        zone: 'Thermal Plant North',
        assignedTechnicianId: 'usr-tech-01',
        technicianName: 'Alex Vance',
        supervisorId: 'usr-sup-01',
        supervisorName: 'Marcus Reid',
        status: 'IN_PROGRESS',
        syncState: 'SYNCED',
        riskLevel: 'HIGH',
        score: 74,
        scheduledDate: '2026-09-22',
        offlineDraft: false,
        version: 3,
        generalNotes: 'Boiler pressure check conducted under peak load.',
        signatures: {
          technician: { name: 'Alex Vance', timestamp: '2026-09-22T08:10:00Z' }
        },
        createdAt: '2026-09-22T08:00:00Z',
        updatedAt: '2026-09-22T08:45:00Z',
        checklist: [
          {
            id: 'chk-1',
            inspectionId: 'insp-101',
            category: 'Integrity Check',
            title: 'Casing Structural Weld Examination',
            requirement: 'No hairline fractures or corrosion pitting >0.5mm',
            status: 'PASS',
            measuredValue: '0.12mm pitting depth (Within limit)',
            toleranceRange: '< 0.50mm',
            notes: 'Ultrasonic sensor confirms acoustic reflection within specification.',
            timestamp: '2026-09-22T08:15:00Z'
          },
          {
            id: 'chk-2',
            inspectionId: 'insp-101',
            category: 'Pressure Systems',
            title: 'Relief Seal Hydrostatic PSI Tolerance',
            requirement: 'Minimum seal test pressure 350 PSI sustained for 5 min',
            status: 'WARNING',
            measuredValue: '342 PSI (Slight decay rate)',
            toleranceRange: '350 - 365 PSI',
            notes: 'Secondary gasket experiencing micro-leakage under peak test.',
            timestamp: '2026-09-22T08:30:00Z'
          }
        ],
        defects: [
          {
            id: 'def-01',
            inspectionId: 'insp-101',
            severity: 'HIGH',
            title: 'Secondary Gasket Micro-Crevice Degradation',
            description: 'Inspection port 4 gasket showing elastomer stress cracking.',
            recommendedAction: 'Replace elastomer seal kit #BLR-400-SEAL.',
            timestamp: '2026-09-22T08:32:00Z',
            resolved: false
          }
        ]
      },
      {
        id: 'insp-102',
        code: 'INS-2026-0892',
        title: 'Cryogenic Relief Valve Mechanical Verification',
        equipmentId: 'eq-03',
        equipmentName: 'Emergency Cryogenic Relief Valve RV-88',
        facility: 'Cryo Terminal East',
        zone: 'Storage Sphere #4',
        assignedTechnicianId: 'usr-tech-01',
        technicianName: 'Alex Vance',
        supervisorId: 'usr-sup-01',
        supervisorName: 'Marcus Reid',
        status: 'FAILED',
        syncState: 'SYNCED',
        riskLevel: 'CRITICAL',
        score: 42,
        scheduledDate: '2026-09-21',
        completedDate: '2026-09-21T16:20:00Z',
        offlineDraft: false,
        version: 4,
        signatures: {
          technician: { name: 'Alex Vance', timestamp: '2026-09-21T16:15:00Z' },
          supervisor: { name: 'Marcus Reid', timestamp: '2026-09-21T17:00:00Z' }
        },
        createdAt: '2026-09-21T15:00:00Z',
        updatedAt: '2026-09-21T16:25:00Z',
        checklist: [
          {
            id: 'chk-201',
            inspectionId: 'insp-102',
            category: 'Actuator',
            title: 'Pneumatic Actuator Stroke Travel',
            requirement: 'Full open cycle must complete in < 2.0s at -40°C',
            status: 'FAIL',
            measuredValue: '4.8s (Actuator Sticking)',
            toleranceRange: '< 2.0s',
            notes: 'Actuator cylinder frost accumulation prevents rapid seating.',
            timestamp: '2026-09-21T15:40:00Z'
          }
        ],
        defects: [
          {
            id: 'def-02',
            inspectionId: 'insp-102',
            severity: 'CRITICAL',
            title: 'Emergency Relief Actuator Sticking Under Sub-Zero',
            description: 'Valve fails to actuate within mandatory 2.0 second window.',
            recommendedAction: 'Immediate unit replacement and overhaul.',
            timestamp: '2026-09-21T16:05:00Z',
            resolved: false
          }
        ]
      }
    ];
    initialInspections.forEach(i => this.inspectionsMap.set(i.id, i));

    // 5. Conflicts
    this.conflictsMap.set('conf-01', {
      id: 'conf-01',
      inspectionId: 'insp-105',
      inspectionCode: 'INS-2026-0895',
      equipmentName: 'Ventilation Fan Array AHU-09',
      field: 'Phase-to-Phase Insulation Resistance',
      localValue: '450 MΩ (Megger Fluke 1587 FC calibrated)',
      serverValue: '85 MΩ (Last recorded remote telemetry)',
      detectedAt: '2026-09-22T09:12:00Z',
      technicianName: 'Alex Vance',
      supervisorName: 'Marcus Reid',
      status: 'ACTIVE'
    });

    // 6. Audit History
    this.auditHistoryList = [
      {
        id: 'aud-01',
        timestamp: '2026-09-22T09:12:15Z',
        userId: 'usr-tech-01',
        userName: 'Alex Vance',
        userRole: 'TECHNICIAN',
        action: 'CRDT_CONFLICT_DETECTED',
        targetType: 'CONFLICT',
        targetId: 'conf-01',
        details: 'Offline state diverged on INS-2026-0895. Flagged for CRDT resolution.',
        ipAddress: '10.200.4.15',
        hash: 'e8b39d102fca76a1'
      },
      {
        id: 'aud-02',
        timestamp: '2026-09-22T08:45:00Z',
        userId: 'usr-tech-01',
        userName: 'Alex Vance',
        userRole: 'TECHNICIAN',
        action: 'INSPECTION_CHECKLIST_UPDATE',
        targetType: 'INSPECTION',
        targetId: 'insp-101',
        details: 'Logged warning defect on High-Pressure Steam Boiler B-12 gasket seal.',
        ipAddress: '10.200.4.15',
        hash: 'a910bf443ce1982b'
      }
    ];
  }

  // --- QUERY & WRITE METHODS ---

  public getAllInspections(filters?: { status?: string; technicianId?: string; equipmentId?: string }): DBInspection[] {
    let result = Array.from(this.inspectionsMap.values());
    if (filters) {
      if (filters.status) {
        result = result.filter(i => i.status === filters.status);
      }
      if (filters.technicianId) {
        result = result.filter(i => i.assignedTechnicianId === filters.technicianId);
      }
      if (filters.equipmentId) {
        result = result.filter(i => i.equipmentId === filters.equipmentId);
      }
    }
    return result;
  }

  public getInspectionById(id: string): DBInspection | null {
    return this.inspectionsMap.get(id) || null;
  }

  public createInspection(inspData: Partial<DBInspection>, userId: string, userName: string): DBInspection {
    const id = inspData.id || `insp-${Date.now()}`;
    const code = inspData.code || `INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInsp: DBInspection = {
      id,
      code,
      title: inspData.title || 'Untitled Inspection Schedule',
      equipmentId: inspData.equipmentId || 'eq-01',
      equipmentName: inspData.equipmentName || 'Main Turbine Generator T-400',
      facility: inspData.facility || 'Alpha Energy Sector 4',
      zone: inspData.zone || 'Bay 12 - Substation 03',
      assignedTechnicianId: inspData.assignedTechnicianId || userId,
      technicianName: inspData.technicianName || userName,
      supervisorId: inspData.supervisorId || 'usr-sup-01',
      supervisorName: inspData.supervisorName || 'Marcus Reid',
      status: inspData.status || 'IN_PROGRESS',
      syncState: 'SYNCED',
      riskLevel: inspData.riskLevel || 'MEDIUM',
      score: inspData.score || 0,
      scheduledDate: inspData.scheduledDate || new Date().toISOString().split('T')[0],
      offlineDraft: false,
      version: 1,
      generalNotes: inspData.generalNotes || '',
      signatures: inspData.signatures || {
        technician: { name: userName, timestamp: new Date().toISOString() }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checklist: inspData.checklist || [],
      defects: inspData.defects || []
    };

    this.inspectionsMap.set(id, newInsp);
    this.addAuditEntry(userId, userName, 'TECHNICIAN', 'INSPECTION_CREATED', 'INSPECTION', id, `Created inspection ${code} on backend database.`);
    return newInsp;
  }

  public updateInspection(id: string, updates: Partial<DBInspection>, userId: string, userName: string, userRole: string): DBInspection {
    const existing = this.inspectionsMap.get(id);
    if (!existing) {
      throw new Error(`Inspection ${id} not found in database.`);
    }

    const updated: DBInspection = {
      ...existing,
      ...updates,
      syncState: 'SYNCED',
      offlineDraft: false,
      version: (existing.version || 1) + 1,
      updatedAt: new Date().toISOString()
    };

    this.inspectionsMap.set(id, updated);
    this.addAuditEntry(userId, userName, userRole, 'INSPECTION_UPDATED', 'INSPECTION', id, `Updated inspection ${updated.code}. Version ${updated.version}.`);
    return updated;
  }

  // --- SYNC PUSH & PULL ---

  public processSyncPush(operations: Array<{ type: string; entityId: string; entityType: string; payload: Record<string, unknown>; timestamp: string; clientId?: string; operationId?: string; version?: number; crdtUpdate?: string }>, userId: string, userName: string, clientIdParam?: string) {
    const processedOps: string[] = [];
    const syncedItemIds: string[] = [];

    for (const op of operations) {
      const opClientId = op.clientId || clientIdParam || 'client-default';
      const opId = op.operationId || `op-srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      this.syncOpsList.push({
        id: opId,
        operationType: op.type,
        entityType: op.entityType || 'INSPECTION',
        entityId: op.entityId,
        payload: op.payload,
        clientTimestamp: op.timestamp,
        serverTimestamp: new Date().toISOString(),
        status: 'CONFIRMED',
        clientId: opClientId,
        userId
      });

      if (op.entityType === 'INSPECTION' || op.type.includes('INSPECTION') || op.type.includes('CHECKLIST') || op.type.includes('DEFECT') || op.type.includes('STATUS')) {
        const payload = op.payload as Partial<DBInspection>;
        const entityId = op.entityId || payload.id;
        
        if (entityId) {
          const existing = this.inspectionsMap.get(entityId);
          if (existing) {
            // Merge existing inspection record with CRDT operation update
            const newVersion = Math.max((existing.version || 1) + 1, op.version || 1);
            const updated: DBInspection = {
              ...existing,
              ...payload,
              syncState: 'SYNCED',
              offlineDraft: false,
              version: newVersion,
              updatedAt: new Date().toISOString()
            };
            this.inspectionsMap.set(entityId, updated);
            syncedItemIds.push(entityId);
          } else if (payload.title && payload.equipmentId) {
            // Create new inspection record
            const created = this.createInspection(payload, userId, userName);
            syncedItemIds.push(created.id);
          }
        }
      }

      processedOps.push(opId);
    }

    this.addAuditEntry(userId, userName, 'TECHNICIAN', 'CRDT_SYNC_PUSH_PROCESSED', 'SYNC', `batch-${Date.now()}`, `Processed ${operations.length} CRDT client operations from ${clientIdParam || 'field-device'}.`);

    return {
      success: true,
      processedOpsCount: processedOps.length,
      processedOps,
      syncedItemIds,
      serverTime: new Date().toISOString()
    };
  }

  public processSyncPull(lastSyncedAt?: string) {
    const minTime = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;
    const items = Array.from(this.inspectionsMap.values()).filter(i => new Date(i.updatedAt).getTime() >= minTime);
    return {
      success: true,
      inspections: items,
      serverTime: new Date().toISOString()
    };
  }

  // --- CONFLICT RESOLUTION ---

  public resolveConflict(conflictId: string, resolution: string, winningValue: string, notes: string, userId: string, userName: string, userRole: string) {
    const conflict = this.conflictsMap.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found.`);
    }

    conflict.status = 'RESOLVED';
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedBy = userId;
    conflict.resolutionPolicy = resolution;
    conflict.winningValue = winningValue;
    conflict.notes = notes;

    this.conflictsMap.set(conflictId, conflict);

    this.addAuditEntry(userId, userName, userRole, 'CRDT_CONFLICT_RESOLVED', 'CONFLICT', conflictId, `Resolved conflict ${conflictId} with policy ${resolution}. Winning value: ${winningValue}`);

    return conflict;
  }

  // --- AUDIT HISTORY ---

  public getAuditHistory(inspectionId?: string): DBAuditEntry[] {
    if (!inspectionId) {
      return [...this.auditHistoryList];
    }
    return this.auditHistoryList.filter(a => a.targetId === inspectionId || a.details.includes(inspectionId));
  }

  public addAuditEntry(userId: string, userName: string, userRole: string, action: string, targetType: string, targetId: string, details: string) {
    const entry: DBAuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userRole,
      action,
      targetType,
      targetId,
      details,
      ipAddress: '10.200.4.15 (Cloud Run Server)',
      hash: Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10)
    };
    this.auditHistoryList.unshift(entry);
    return entry;
  }

  // --- MEDIA CHUNKED UPLOADS ---

  public initMediaUpload(params: { inspectionId?: string; fileName: string; fileType: string; fileSize: number; totalChunks: number }) {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const record: DBMediaUpload = {
      id: `media-${Date.now()}`,
      uploadId,
      inspectionId: params.inspectionId,
      fileName: params.fileName,
      fileType: params.fileType,
      fileSize: params.fileSize,
      totalChunks: params.totalChunks,
      receivedChunks: 0,
      storagePath: `/uploads/${uploadId}/${params.fileName}`,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chunks: new Map()
    };

    this.mediaUploadsMap.set(uploadId, record);
    return record;
  }

  public saveMediaChunk(uploadId: string, chunkIndex: number, totalChunks: number, chunkData: string) {
    const upload = this.mediaUploadsMap.get(uploadId);
    if (!upload) {
      throw new Error(`Upload session ${uploadId} not found.`);
    }

    upload.chunks.set(chunkIndex, chunkData);
    upload.receivedChunks = upload.chunks.size;
    upload.updatedAt = new Date().toISOString();

    if (upload.receivedChunks >= totalChunks) {
      upload.status = 'COMPLETED';
    }

    return {
      uploadId,
      chunkIndex,
      receivedChunks: upload.receivedChunks,
      totalChunks,
      status: upload.status,
      isComplete: upload.status === 'COMPLETED'
    };
  }

  public getMediaUploadStatus(uploadId: string) {
    const upload = this.mediaUploadsMap.get(uploadId);
    if (!upload) {
      return null;
    }

    const missingChunks: number[] = [];
    for (let i = 0; i < upload.totalChunks; i++) {
      if (!upload.chunks.has(i)) {
        missingChunks.push(i);
      }
    }

    const progressPercentage = Math.round((upload.receivedChunks / upload.totalChunks) * 100);

    return {
      uploadId: upload.uploadId,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      receivedChunks: upload.receivedChunks,
      totalChunks: upload.totalChunks,
      progressPercentage,
      status: upload.status,
      missingChunks,
      s3Location: `s3://wa1-field-evidence/uploads/${upload.uploadId}/${upload.fileName}`
    };
  }

  public completeMediaUpload(uploadId: string) {
    const upload = this.mediaUploadsMap.get(uploadId);
    if (!upload) {
      throw new Error(`Upload session ${uploadId} not found.`);
    }

    upload.status = 'COMPLETED';
    upload.updatedAt = new Date().toISOString();

    return {
      success: true,
      uploadId,
      fileName: upload.fileName,
      totalChunks: upload.totalChunks,
      receivedChunks: upload.receivedChunks,
      s3Url: `s3://wa1-field-evidence/uploads/${upload.uploadId}/${upload.fileName}`,
      publicUrl: `/uploads/${upload.uploadId}/${upload.fileName}`,
      completedAt: upload.updatedAt
    };
  }

  // --- ADDITIONAL ENTERPRISE DATA ACCESSORS ---

  public getAllEquipment(): DBEquipment[] {
    return Array.from(this.equipmentMap.values());
  }

  public getAllTasks(): DBTask[] {
    return Array.from(this.tasksMap.values());
  }

  public createTask(task: Partial<DBTask>, userId: string, userName: string): DBTask {
    const id = `task-${Date.now()}`;
    const newRecord: DBTask = {
      id,
      title: task.title || 'Assigned Inspection Task',
      equipmentId: task.equipmentId || 'eq-01',
      equipmentName: task.equipmentName || 'Main Turbine Generator T-400',
      assignedTechnicianId: task.assignedTechnicianId || 'usr-tech-01',
      technicianName: task.technicianName || 'Alex Vance',
      priority: task.priority || 'HIGH',
      status: task.status || 'ASSIGNED',
      dueDate: task.dueDate || new Date().toISOString().split('T')[0],
      instructions: task.instructions || 'Execute full compliance inspection',
      createdAt: new Date().toISOString()
    };
    this.tasksMap.set(id, newRecord);
    this.addAuditEntry(userId, userName, 'SUPERVISOR', 'TASK_CREATED', 'TASK', id, `Assigned task ${id} to ${newRecord.technicianName}`);
    return newRecord;
  }

  public getRiskAlerts() {
    return [
      {
        id: 'alert-01',
        equipmentId: 'eq-03',
        equipmentName: 'Emergency Cryogenic Relief Valve RV-88',
        riskLevel: 'CRITICAL',
        title: 'Repeated Valve Seat Leakage',
        summary: 'Pressure has declined during the last 3 inspections. Seal wear rate exceeds threshold.',
        suggestedAction: 'Immediate supervisor sign-off and pressure testing required.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'alert-02',
        equipmentId: 'eq-02',
        equipmentName: 'High-Pressure Steam Boiler B-12',
        riskLevel: 'HIGH',
        title: 'Casing Structural Fracture Warning',
        summary: 'Hairline stress fracture recorded during ultrasonic sweep.',
        suggestedAction: 'Schedule NDT dye penetrant examination within 24 hours.',
        createdAt: new Date().toISOString()
      }
    ];
  }

  public getNotifications(): DBNotification[] {
    return [
      {
        id: 'notif-01',
        userId: 'usr-tech-01',
        title: 'New Assignment',
        message: 'High-Pressure Steam Boiler B-12 inspection assigned for today.',
        type: 'INFO',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'notif-02',
        userId: 'usr-sup-01',
        title: 'CRDT Conflict Detected',
        message: 'Ventilation AHU-09 has diverged draft values between field technicians.',
        type: 'ALERT',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];
  }
}

export const dbStore = new RelationalDatabaseStore();
