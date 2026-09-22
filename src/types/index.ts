export type UserRole = 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';

export interface UserPermissions {
  canResolveConflicts: boolean;
  canManageUsers: boolean;
  canChangeSettings: boolean;
  canApproveInspections: boolean;
  canViewAnalytics: boolean;
  canManageEquipment: boolean;
  canManageRoles: boolean;
  canPerformInspections: boolean;
  canUseAIAssistant: boolean;
  canViewAuditLogs: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  title: string;
  badgeNumber: string;
  certificationLevel: string;
  lastActive: string;
  permissions?: UserPermissions;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresIn: number;
  issuedAt: number;
}

export type InspectionStatus = 
  | 'DRAFT' 
  | 'IN_PROGRESS' 
  | 'PENDING_REVIEW' 
  | 'PASSED' 
  | 'FAILED' 
  | 'CONFLICT';

export type SyncState = 'SYNCED' | 'PENDING' | 'SYNCING' | 'CONFLICT';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  requirement: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_CHECKED';
  notes?: string;
  photoUrl?: string;
  measuredValue?: string;
  toleranceRange?: string;
  timestamp?: string;
  failReason?: string;
  failNotes?: string;
  failSeverity?: RiskLevel;
  evidencePhotoUrl?: string;
  evidenceDescription?: string;
}

export interface Defect {
  id: string;
  severity: RiskLevel;
  title: string;
  description: string;
  recommendedAction: string;
  photoUrl?: string;
  timestamp: string;
  resolved: boolean;
}

export interface EvidencePhoto {
  id: string;
  url: string;
  description: string;
  timestamp: string;
  category?: string;
}

export interface InspectionGpsLocation {
  available: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: string;
  statusText?: string;
}

export interface Inspection {
  id: string;
  title: string;
  code: string;
  equipmentId: string;
  equipmentName: string;
  facility: string;
  zone: string;
  assignedTechnicianId: string;
  technicianName: string;
  supervisorId?: string;
  supervisorName?: string;
  status: InspectionStatus;
  syncState: SyncState;
  riskLevel: RiskLevel;
  score: number; // 0 - 100
  scheduledDate: string;
  completedDate?: string;
  checklist: ChecklistItem[];
  defects: Defect[];
  signatures: {
    technician?: { name: string; timestamp: string };
    supervisor?: { name: string; timestamp: string };
  };
  offlineDraft: boolean;
  version: number;
  lastModified: string;
  generalNotes?: string;
  evidencePhotos?: EvidencePhoto[];
  gpsLocation?: InspectionGpsLocation;
}

export interface ConflictItem {
  id: string;
  inspectionId: string;
  inspectionCode: string;
  equipmentName: string;
  field: string;
  localValue: string;
  serverValue: string;
  detectedAt: string;
  technicianName: string;
  supervisorName: string;
  status: 'ACTIVE' | 'RESOLVED';
  resolution?: 'USE_LOCAL' | 'USE_SERVER' | 'MANUAL_MERGE';
}

export interface Equipment {
  id: string;
  name: string;
  tag: string;
  category: string;
  facility: string;
  location: string;
  status: 'OPERATIONAL' | 'NEEDS_MAINTENANCE' | 'CRITICAL_OFFLINE' | 'DECOMMISSIONED';
  lastInspectionDate: string;
  nextScheduledDate: string;
  healthScore: number;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType: 'INSPECTION' | 'EQUIPMENT' | 'USER' | 'CONFLICT' | 'SYSTEM';
  targetId: string;
  details: string;
  ipAddress: string;
  hash: string;
}

export interface SyncStats {
  unsyncedCount: number;
  lastSyncTimestamp: string;
  storageUsageBytes: number;
  indexedDbRecords: number;
  conflictsCount: number;
}

// ==========================================
// Offline-First Local Database Store Schema
// ==========================================

export interface ChecklistItemRecord {
  id: string;
  inspectionId: string;
  category: string;
  title: string;
  requirement: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_CHECKED';
  notes?: string;
  measuredValue?: string;
  toleranceRange?: string;
  failReason?: string;
  failNotes?: string;
  failSeverity?: RiskLevel;
  evidencePhotoUrl?: string;
  evidenceDescription?: string;
  timestamp: string;
  syncState: SyncState;
}

export interface InspectionNoteRecord {
  id: string;
  inspectionId: string;
  content: string;
  authorId: string;
  authorName: string;
  category?: 'GENERAL' | 'SAFETY' | 'EQUIPMENT';
  timestamp: string;
  syncState: SyncState;
}

export interface EvidenceMetadataRecord {
  id: string;
  inspectionId: string;
  checklistItemId?: string;
  caption: string;
  filename: string;
  dataUrl?: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracy?: number;
  syncState: SyncState;
}

export interface PendingOperationRecord {
  id: string;
  type: 'UPDATE_INSPECTION' | 'SAVE_CHECKLIST' | 'ADD_NOTE' | 'ATTACH_EVIDENCE' | 'STATUS_CHANGE';
  entityId: string;
  entityType: 'INSPECTION' | 'CHECKLIST_ITEM' | 'NOTE' | 'EVIDENCE';
  payload: any;
  timestamp: string;
  status: 'QUEUED' | 'IN_FLIGHT' | 'FAILED';
  retryCount: number;
  errorMessage?: string;
}

export interface SyncStatusRecord {
  id: string;
  entityType: string;
  entityId: string;
  lastAttemptAt?: string;
  status: SyncState | 'FAILED';
  pendingChangesCount: number;
  errorMessage?: string;
}

export type OperationStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
export type OperationNetworkState = 'ONLINE' | 'OFFLINE';

export interface Operation {
  operationId: string;
  clientId: string;
  userId: string;
  userName?: string;
  entityId: string;
  entityName?: string;
  entityType: 'INSPECTION' | 'CHECKLIST_ITEM' | 'EQUIPMENT' | 'NOTE' | 'EVIDENCE' | 'DEFECT';
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  networkState: OperationNetworkState;
  status: OperationStatus;
  errorMessage?: string;
  conflictDetails?: string;
  retryCount?: number;
  syncedAt?: string;
}

export interface SystemMetadataRecord {
  key: string;
  value: any;
  updatedAt: string;
  description?: string;
}


