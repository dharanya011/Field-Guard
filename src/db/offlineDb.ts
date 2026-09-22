import Dexie, { type Table } from 'dexie';
import type { 
  Inspection, 
  Equipment, 
  AuditLog, 
  ConflictItem,
  ChecklistItemRecord,
  InspectionNoteRecord,
  EvidenceMetadataRecord,
  PendingOperationRecord,
  SyncStatusRecord,
  SystemMetadataRecord,
  Operation,
  OperationStatus,
  OperationNetworkState
} from '../types';

export class WA1Database extends Dexie {
  inspections!: Table<Inspection, string>;
  inspectionItems!: Table<ChecklistItemRecord, string>;
  notes!: Table<InspectionNoteRecord, string>;
  evidenceMetadata!: Table<EvidenceMetadataRecord, string>;
  pendingOperations!: Table<PendingOperationRecord, string>;
  operations!: Table<Operation, string>;
  syncStatus!: Table<SyncStatusRecord, string>;
  systemMetadata!: Table<SystemMetadataRecord, string>;
  equipment!: Table<Equipment, string>;
  auditLogs!: Table<AuditLog, string>;
  conflicts!: Table<ConflictItem, string>;

  constructor() {
    super('WA1FieldInspectionDB');
    this.version(1).stores({
      inspections: 'id, code, equipmentId, assignedTechnicianId, status, syncState, riskLevel, scheduledDate',
      equipment: 'id, tag, facility, status, criticality',
      auditLogs: 'id, timestamp, userId, action, targetType',
      conflicts: 'id, inspectionId, status'
    });
    this.version(2).stores({
      inspections: 'id, code, equipmentId, assignedTechnicianId, status, syncState, riskLevel, scheduledDate, lastModified',
      inspectionItems: 'id, inspectionId, category, title, status, syncState, timestamp',
      notes: 'id, inspectionId, authorId, syncState, timestamp',
      evidenceMetadata: 'id, inspectionId, checklistItemId, syncState, capturedAt',
      pendingOperations: 'id, type, entityId, status, timestamp',
      syncStatus: 'id, entityType, entityId, status',
      systemMetadata: 'key, updatedAt',
      equipment: 'id, tag, facility, status, criticality',
      auditLogs: 'id, timestamp, userId, action, targetType',
      conflicts: 'id, inspectionId, status'
    });
    this.version(3).stores({
      inspections: 'id, code, equipmentId, assignedTechnicianId, status, syncState, riskLevel, scheduledDate, lastModified',
      inspectionItems: 'id, inspectionId, category, title, status, syncState, timestamp',
      notes: 'id, inspectionId, authorId, syncState, timestamp',
      evidenceMetadata: 'id, inspectionId, checklistItemId, syncState, capturedAt',
      pendingOperations: 'id, type, entityId, status, timestamp',
      operations: 'operationId, clientId, userId, entityId, entityType, field, networkState, status, timestamp',
      syncStatus: 'id, entityType, entityId, status',
      systemMetadata: 'key, updatedAt',
      equipment: 'id, tag, facility, status, criticality',
      auditLogs: 'id, timestamp, userId, action, targetType',
      conflicts: 'id, inspectionId, status'
    });
  }
}

export const db = new WA1Database();

// Initial seed data to give the user a rich, production-grade enterprise experience immediately
export const initialEquipments: Equipment[] = [
  {
    id: 'eq-01',
    name: 'Main Turbine Generator T-400',
    tag: 'TURB-GEN-400A',
    category: 'Power Generation',
    facility: 'Alpha Energy Sector 4',
    location: 'Bay 12 - Substation 03',
    status: 'OPERATIONAL',
    lastInspectionDate: '2026-09-18',
    nextScheduledDate: '2026-09-25',
    healthScore: 94,
    criticality: 'HIGH'
  },
  {
    id: 'eq-02',
    name: 'High-Pressure Steam Boiler B-12',
    tag: 'BLR-HP-012',
    category: 'Thermal Vessel',
    facility: 'Alpha Energy Sector 4',
    location: 'Thermal Plant North',
    status: 'NEEDS_MAINTENANCE',
    lastInspectionDate: '2026-09-20',
    nextScheduledDate: '2026-09-22',
    healthScore: 71,
    criticality: 'HIGH'
  },
  {
    id: 'eq-03',
    name: 'Emergency Cryogenic Relief Valve RV-88',
    tag: 'VALVE-CRYO-088',
    category: 'Safety Systems',
    facility: 'Cryo Terminal East',
    location: 'Storage Sphere #4',
    status: 'CRITICAL_OFFLINE',
    lastInspectionDate: '2026-09-21',
    nextScheduledDate: '2026-09-22',
    healthScore: 42,
    criticality: 'HIGH'
  },
  {
    id: 'eq-04',
    name: 'Ventilation Fan Array AHU-09',
    tag: 'HVAC-AHU-009',
    category: 'HVAC & Environmental',
    facility: 'Central Control Hub',
    location: 'Roof Level Section C',
    status: 'OPERATIONAL',
    lastInspectionDate: '2026-09-15',
    nextScheduledDate: '2026-10-15',
    healthScore: 98,
    criticality: 'LOW'
  },
  {
    id: 'eq-05',
    name: 'Chemical Dosing Pump P-302',
    tag: 'PUMP-CHEM-302',
    category: 'Fluid Transport',
    facility: 'Water Reclamation Plant',
    location: 'Treatment Chamber 2',
    status: 'OPERATIONAL',
    lastInspectionDate: '2026-09-19',
    nextScheduledDate: '2026-09-26',
    healthScore: 89,
    criticality: 'MEDIUM'
  },
  {
    id: 'eq-25',
    name: 'Fire Extinguisher #25',
    tag: 'FE-025',
    category: 'Life Safety Systems',
    facility: 'Alpha Energy Sector 4',
    location: 'Corridor B - Emergency Station 2',
    status: 'NEEDS_MAINTENANCE',
    lastInspectionDate: '2026-09-20',
    nextScheduledDate: '2026-09-22',
    healthScore: 68,
    criticality: 'HIGH'
  }
];

export const initialInspections: Inspection[] = [
  {
    id: 'insp-25',
    code: 'INS-2026-0025',
    title: 'Monthly Safety & Fire Suppression Audit',
    equipmentId: 'eq-25',
    equipmentName: 'Fire Extinguisher #25',
    facility: 'Alpha Energy Sector 4',
    zone: 'Corridor B - Emergency Station 2',
    assignedTechnicianId: 'usr-tech-01',
    technicianName: 'Alex Rivera (Technician A)',
    supervisorId: 'usr-sup-01',
    supervisorName: 'Marcus Reid (Field Director)',
    status: 'IN_PROGRESS',
    syncState: 'PENDING',
    riskLevel: 'HIGH',
    score: 50,
    scheduledDate: '2026-09-22',
    offlineDraft: true,
    version: 1,
    lastModified: '2026-09-22T09:40:00Z',
    checklist: [
      {
        id: 'chk-fe-1',
        category: 'Pressure & Gauge',
        title: 'Pressure Gauge',
        requirement: 'Pointer must rest firmly within green operable band (195 psi +/- 10%)',
        status: 'FAIL',
        measuredValue: '135 psi',
        toleranceRange: '185-205 psi',
        failReason: 'Pressure below green recharge threshold',
        failNotes: 'Gauge reading 135 psi, cylinder depressurized below operational limits',
        failSeverity: 'HIGH'
      },
      {
        id: 'chk-fe-2',
        category: 'Physical Enclosure',
        title: 'Physical Damage',
        requirement: 'Cylinder body, nozzle, and horn free of dents, rust, and chemical corrosion',
        status: 'PASS',
        notes: 'Cylinder exterior clean, no visible metal fatigue or nozzle obstruction'
      },
      {
        id: 'chk-fe-3',
        category: 'Tamper Evident',
        title: 'Safety Seal',
        requirement: 'Tamper indicator wire and pull-pin intact with unbroken inspection tag',
        status: 'FAIL',
        failReason: 'Plastic tamper seal severed or missing',
        failNotes: 'Tamper wire snapped; locking pull-pin loose in cradle',
        failSeverity: 'CRITICAL'
      },
      {
        id: 'chk-fe-4',
        category: 'Certification',
        title: 'Expiry Date',
        requirement: 'Annual hydrostatic test and recharge date valid and clearly legible',
        status: 'PASS',
        notes: 'Certified tag valid through November 2026'
      }
    ],
    defects: [
      {
        id: 'def-fe-1',
        severity: 'CRITICAL',
        title: 'Broken Safety Seal - Fire Extinguisher #25',
        description: 'Tamper indicator wire was broken, leaving pull pin unsecured.',
        recommendedAction: 'Lockout unit, replace tamper seal and re-verify pin tension.',
        timestamp: '2026-09-22T09:40:00Z',
        resolved: false
      }
    ],
    generalNotes: 'Corridor B station inspection completed offline at 09:40. Defect logged for broken safety seal.'
  },
  {
    id: 'insp-101',
    code: 'INS-2026-0891',
    title: 'High-Pressure Safety & Valve Tolerance Audit',
    equipmentId: 'eq-02',
    equipmentName: 'High-Pressure Steam Boiler B-12',
    facility: 'Alpha Energy Sector 4',
    zone: 'Thermal Plant North',
    assignedTechnicianId: 'usr-tech-01',
    technicianName: 'Alex Vance (Lead Field Tech)',
    supervisorId: 'usr-sup-01',
    supervisorName: 'Marcus Reid (Field Director)',
    status: 'IN_PROGRESS',
    syncState: 'PENDING',
    riskLevel: 'HIGH',
    score: 74,
    scheduledDate: '2026-09-22',
    offlineDraft: true,
    version: 3,
    lastModified: '2026-09-22T08:45:00Z',
    checklist: [
      {
        id: 'chk-1',
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
        category: 'Pressure Systems',
        title: 'Relief Seal Hydrostatic PSI Tolerance',
        requirement: 'Minimum seal test pressure 350 PSI sustained for 5 min',
        status: 'WARNING',
        measuredValue: '342 PSI (Slight decay rate)',
        toleranceRange: '350 - 365 PSI',
        notes: 'Secondary gasket experiencing micro-leakage under peak test.',
        timestamp: '2026-09-22T08:30:00Z'
      },
      {
        id: 'chk-3',
        category: 'Thermal Sensors',
        title: 'Thermocouple Thermocouple Calibration',
        requirement: 'Calibrated within +/- 1.5°C against NIST reference',
        status: 'PASS',
        measuredValue: '+0.4°C variance',
        toleranceRange: '+/- 1.5°C',
        timestamp: '2026-09-22T08:40:00Z'
      },
      {
        id: 'chk-4',
        category: 'Electrical & E-Stop',
        title: 'Emergency Fuel Shutoff Solenoid Response',
        requirement: 'Total cutoff trip time under 180ms',
        status: 'NOT_CHECKED',
        toleranceRange: '< 180ms'
      }
    ],
    defects: [
      {
        id: 'def-01',
        severity: 'HIGH',
        title: 'Secondary Gasket Micro-Crevice Degradation',
        description: 'Inspection port 4 gasket showing elastomer stress cracking. Hydrostatic test showed 8 PSI drop over 3 minutes.',
        recommendedAction: 'Replace elastomer seal kit #BLR-400-SEAL before full thermal cycle reactivation.',
        timestamp: '2026-09-22T08:32:00Z',
        resolved: false
      }
    ],
    signatures: {
      technician: { name: 'Alex Vance', timestamp: '2026-09-22T08:10:00Z' }
    }
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
    technicianName: 'Alex Vance (Lead Field Tech)',
    supervisorId: 'usr-sup-01',
    supervisorName: 'Marcus Reid (Field Director)',
    status: 'FAILED',
    syncState: 'SYNCED',
    riskLevel: 'CRITICAL',
    score: 42,
    scheduledDate: '2026-09-21',
    completedDate: '2026-09-21T16:20:00Z',
    offlineDraft: false,
    version: 4,
    lastModified: '2026-09-21T16:25:00Z',
    checklist: [
      {
        id: 'chk-201',
        category: 'Actuator',
        title: 'Pneumatic Actuator Stroke Travel',
        requirement: 'Full open cycle must complete in < 2.0s at -40°C',
        status: 'FAIL',
        measuredValue: '4.8s (Actuator Sticking)',
        toleranceRange: '< 2.0s',
        notes: 'Actuator cylinder frost accumulation prevents rapid seating.',
        timestamp: '2026-09-21T15:40:00Z'
      },
      {
        id: 'chk-202',
        category: 'Materials',
        title: 'Cryogenic Valve Stem Packing',
        requirement: 'Zero bubble emissions under helium leak test',
        status: 'FAIL',
        measuredValue: 'Detectable micro-emission: 12 ppm',
        toleranceRange: '0 ppm',
        notes: 'Helium sniffer triggered alarm at packing bonnet.',
        timestamp: '2026-09-21T16:00:00Z'
      }
    ],
    defects: [
      {
        id: 'def-02',
        severity: 'CRITICAL',
        title: 'Emergency Relief Actuator Sticking Under Sub-Zero',
        description: 'Valve fails to actuate within mandatory 2.0 second window. Lockout/tagout protocol initiated immediately.',
        recommendedAction: 'Immediate unit replacement and overhaul of heat-tracing insulation jacket.',
        timestamp: '2026-09-21T16:05:00Z',
        resolved: false
      }
    ],
    signatures: {
      technician: { name: 'Alex Vance', timestamp: '2026-09-21T16:15:00Z' },
      supervisor: { name: 'Marcus Reid', timestamp: '2026-09-21T17:00:00Z' }
    }
  },
  {
    id: 'insp-103',
    code: 'INS-2026-0893',
    title: 'Quarterly Generator Vibration & Harmonic Analysis',
    equipmentId: 'eq-01',
    equipmentName: 'Main Turbine Generator T-400',
    facility: 'Alpha Energy Sector 4',
    zone: 'Bay 12 - Substation 03',
    assignedTechnicianId: 'usr-tech-01',
    technicianName: 'Alex Vance (Lead Field Tech)',
    supervisorId: 'usr-sup-01',
    supervisorName: 'Marcus Reid (Field Director)',
    status: 'PASSED',
    syncState: 'SYNCED',
    riskLevel: 'LOW',
    score: 96,
    scheduledDate: '2026-09-18',
    completedDate: '2026-09-18T14:30:00Z',
    offlineDraft: false,
    version: 2,
    lastModified: '2026-09-18T14:35:00Z',
    checklist: [
      {
        id: 'chk-301',
        category: 'Vibration',
        title: 'Shaft Radial Displacement Peak-to-Peak',
        requirement: 'ISO 10816 Zone A limit: < 2.3 mm/s RMS',
        status: 'PASS',
        measuredValue: '1.18 mm/s RMS',
        toleranceRange: '< 2.30 mm/s',
        notes: 'Bearings in optimal balancing condition.',
        timestamp: '2026-09-18T13:45:00Z'
      },
      {
        id: 'chk-302',
        category: 'Lube Oil',
        title: 'Dielectric & Particle Viscosity Check',
        requirement: 'ISO cleanliness code 16/14/11 or better',
        status: 'PASS',
        measuredValue: 'Cleanliness Code 14/12/09',
        toleranceRange: '16/14/11 Max',
        timestamp: '2026-09-18T14:10:00Z'
      }
    ],
    defects: [],
    signatures: {
      technician: { name: 'Alex Vance', timestamp: '2026-09-18T14:25:00Z' },
      supervisor: { name: 'Marcus Reid', timestamp: '2026-09-18T15:00:00Z' }
    }
  },
  {
    id: 'insp-104',
    code: 'INS-2026-0894',
    title: 'Reclamation Pump Impeller Cavitation Check',
    equipmentId: 'eq-05',
    equipmentName: 'Chemical Dosing Pump P-302',
    facility: 'Water Reclamation Plant',
    zone: 'Treatment Chamber 2',
    assignedTechnicianId: 'usr-tech-02',
    technicianName: 'Sara Lin (Field Specialist)',
    supervisorId: 'usr-sup-01',
    supervisorName: 'Marcus Reid (Field Director)',
    status: 'PENDING_REVIEW',
    syncState: 'SYNCED',
    riskLevel: 'MEDIUM',
    score: 82,
    scheduledDate: '2026-09-22',
    completedDate: '2026-09-22T06:30:00Z',
    offlineDraft: false,
    version: 1,
    lastModified: '2026-09-22T06:35:00Z',
    checklist: [
      {
        id: 'chk-401',
        category: 'Acoustics',
        title: 'Impeller Suction Cavitation Frequency',
        requirement: 'Decibel envelope under 78 dB(A)',
        status: 'WARNING',
        measuredValue: '81.4 dB(A) intermittent',
        toleranceRange: '< 78 dB(A)',
        notes: 'Mild vapor bubble implosion detected during high-viscosity feed.',
        timestamp: '2026-09-22T06:15:00Z'
      }
    ],
    defects: [
      {
        id: 'def-03',
        severity: 'MEDIUM',
        title: 'Transient Suction Cavitation on Port B',
        description: 'Inlet suction pressure fluctuating below vapor barrier threshold during batch transitions.',
        recommendedAction: 'Adjust inlet throttle damper from 45% to 60% and re-inspect in 48 hours.',
        timestamp: '2026-09-22T06:20:00Z',
        resolved: false
      }
    ],
    signatures: {
      technician: { name: 'Sara Lin', timestamp: '2026-09-22T06:28:00Z' }
    }
  },
  {
    id: 'insp-105',
    code: 'INS-2026-0895',
    title: 'HVAC Air Handler Blower Motor Resistance',
    equipmentId: 'eq-04',
    equipmentName: 'Ventilation Fan Array AHU-09',
    facility: 'Central Control Hub',
    zone: 'Roof Level Section C',
    assignedTechnicianId: 'usr-tech-01',
    technicianName: 'Alex Vance (Lead Field Tech)',
    supervisorId: 'usr-sup-01',
    supervisorName: 'Marcus Reid (Field Director)',
    status: 'CONFLICT',
    syncState: 'CONFLICT',
    riskLevel: 'MEDIUM',
    score: 85,
    scheduledDate: '2026-09-22',
    offlineDraft: true,
    version: 5,
    lastModified: '2026-09-22T09:12:00Z',
    checklist: [
      {
        id: 'chk-501',
        category: 'Motor Winding',
        title: 'Phase-to-Phase Insulation Megger Test',
        requirement: 'Minimum insulation resistance > 100 Megaohms',
        status: 'PASS',
        measuredValue: '450 Megaohms (Local) vs 85 Megaohms (Server draft)',
        toleranceRange: '> 100 MOhm',
        notes: 'Discrepancy detected between offline calibration and previous supervisory snapshot.',
        timestamp: '2026-09-22T09:05:00Z'
      }
    ],
    defects: [],
    signatures: {}
  }
];

export const initialConflicts: ConflictItem[] = [
  {
    id: 'conf-01',
    inspectionId: 'insp-105',
    inspectionCode: 'INS-2026-0895',
    equipmentName: 'Ventilation Fan Array AHU-09',
    field: 'Phase-to-Phase Insulation Resistance',
    localValue: '450 MΩ (Megger Fluke 1587 FC calibrated)',
    serverValue: '85 MΩ (Last recorded remote telemetry 2026-09-21)',
    detectedAt: '2026-09-22T09:12:00Z',
    technicianName: 'Alex Vance',
    supervisorName: 'Marcus Reid',
    status: 'ACTIVE'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'aud-01',
    timestamp: '2026-09-22T09:12:15Z',
    userId: 'usr-tech-01',
    userName: 'Alex Vance',
    userRole: 'TECHNICIAN',
    action: 'CRDT_CONFLICT_DETECTED',
    targetType: 'CONFLICT',
    targetId: 'conf-01',
    details: 'Offline state diverged on INS-2026-0895 (Insulation Resistance value). Flagged for CRDT resolution.',
    ipAddress: '192.168.10.42 (Field Tablet)',
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
    ipAddress: '192.168.10.42 (Field Tablet)',
    hash: 'a910bf443ce1982b'
  },
  {
    id: 'aud-03',
    timestamp: '2026-09-21T17:00:10Z',
    userId: 'usr-sup-01',
    userName: 'Marcus Reid',
    userRole: 'SUPERVISOR',
    action: 'INSPECTION_REJECTED_CRITICAL',
    targetType: 'INSPECTION',
    targetId: 'insp-102',
    details: 'Supervisor signed off FAILED verification on RV-88 valve. Safety lockout triggered.',
    ipAddress: '10.200.4.15 (Terminal Substation)',
    hash: 'c442ff9010aa55e2'
  },
  {
    id: 'aud-04',
    timestamp: '2026-09-20T11:20:00Z',
    userId: 'usr-adm-01',
    userName: 'Elena Rostova',
    userRole: 'ADMIN',
    action: 'EQUIPMENT_CALIBRATION_CERT_ADDED',
    targetType: 'EQUIPMENT',
    targetId: 'eq-01',
    details: 'Uploaded ISO-17025 certificate for Turbine Generator T-400 sensor rig.',
    ipAddress: '10.200.1.5 (HQ Control Room)',
    hash: 'ff7891aa32bc1041'
  }
];

export async function initDatabase() {
  try {
    // Record / verify Schema Version in local system metadata table
    const existingVersionMeta = await db.systemMetadata.get('schemaVersion');
    if (!existingVersionMeta) {
      await db.systemMetadata.put({
        key: 'schemaVersion',
        value: 2,
        updatedAt: new Date().toISOString(),
        description: 'WA-1 Dexie.js Schema v2 (Offline-First Store with Inspections, Items, Notes, Evidence & Ops)'
      });
      await db.systemMetadata.put({
        key: 'dbEngine',
        value: 'Dexie.js (IndexedDB)',
        updatedAt: new Date().toISOString(),
        description: 'Client device primary source of truth while offline'
      });
    }

    const inspCount = await db.inspections.count();
    if (inspCount === 0) {
      await db.inspections.bulkAdd(initialInspections);
      await db.equipment.bulkAdd(initialEquipments);
      await db.conflicts.bulkAdd(initialConflicts);
      await db.auditLogs.bulkAdd(initialAuditLogs);

      // Populate normalized inspection items table
      const initialItems: ChecklistItemRecord[] = [];
      const initialNotes: InspectionNoteRecord[] = [];
      const initialSyncStatus: SyncStatusRecord[] = [];

      initialInspections.forEach(insp => {
        // Items
        insp.checklist.forEach(chk => {
          initialItems.push({
            id: `${insp.id}-${chk.id}`,
            inspectionId: insp.id,
            category: chk.category,
            title: chk.title,
            requirement: chk.requirement,
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
            syncState: insp.syncState
          });
        });

        // Notes
        if (insp.generalNotes) {
          initialNotes.push({
            id: `note-${insp.id}`,
            inspectionId: insp.id,
            content: insp.generalNotes,
            authorId: insp.assignedTechnicianId,
            authorName: insp.technicianName,
            category: 'GENERAL',
            timestamp: insp.lastModified,
            syncState: insp.syncState
          });
        }

        // Sync Status
        initialSyncStatus.push({
          id: `sync-${insp.id}`,
          entityType: 'INSPECTION',
          entityId: insp.id,
          status: insp.syncState,
          pendingChangesCount: insp.syncState === 'PENDING' ? 1 : 0,
          lastAttemptAt: insp.lastModified
        });
      });

      if (initialItems.length > 0) {
        await db.inspectionItems.bulkAdd(initialItems);
      }
      if (initialNotes.length > 0) {
        await db.notes.bulkAdd(initialNotes);
      }
      if (initialSyncStatus.length > 0) {
        await db.syncStatus.bulkAdd(initialSyncStatus);
      }
    }

    // Seed operations if empty
    const opCount = await db.operations.count();
    if (opCount === 0) {
      await db.operations.bulkAdd(initialOperations);
    }
  } catch (err) {
    console.error('Dexie IndexedDB initialization warning:', err);
  }
}

export const initialOperations: Operation[] = [
  {
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
  },
  {
    operationId: 'OP-4D12C8',
    clientId: 'client-wa1-alpha',
    userId: 'usr-tech-01',
    userName: 'Technician A',
    entityId: 'insp-25',
    entityName: 'Fire Extinguisher #25',
    entityType: 'CHECKLIST_ITEM',
    field: 'Pressure Gauge',
    oldValue: '195 psi',
    newValue: '135 psi',
    timestamp: '09:41',
    networkState: 'OFFLINE',
    status: 'PENDING'
  },
  {
    operationId: 'OP-7E43D1',
    clientId: 'client-wa1-alpha',
    userId: 'usr-tech-01',
    userName: 'Technician A',
    entityId: 'insp-101',
    entityName: 'High-Pressure Steam Boiler B-12',
    entityType: 'CHECKLIST_ITEM',
    field: 'Safety Relief Valve',
    oldValue: 'NOT_CHECKED',
    newValue: 'PASS',
    timestamp: '09:35',
    networkState: 'ONLINE',
    status: 'SYNCING'
  },
  {
    operationId: 'OP-1C49F0',
    clientId: 'client-wa1-alpha',
    userId: 'usr-tech-01',
    userName: 'Technician A',
    entityId: 'insp-103',
    entityName: 'Ventilation Fan Array AHU-09',
    entityType: 'INSPECTION',
    field: 'Status',
    oldValue: 'IN_PROGRESS',
    newValue: 'PASSED',
    timestamp: '08:15',
    networkState: 'ONLINE',
    status: 'SYNCED',
    syncedAt: '08:16'
  },
  {
    operationId: 'OP-2E90B4',
    clientId: 'client-wa1-alpha',
    userId: 'usr-tech-01',
    userName: 'Technician A',
    entityId: 'insp-103',
    entityName: 'Ventilation Fan Array AHU-09',
    entityType: 'CHECKLIST_ITEM',
    field: 'Belt Tension & Alignment',
    oldValue: 'WARNING',
    newValue: 'PASS',
    timestamp: '08:12',
    networkState: 'ONLINE',
    status: 'SYNCED',
    syncedAt: '08:16'
  },
  {
    operationId: 'OP-5D82A7',
    clientId: 'client-wa1-alpha',
    userId: 'usr-tech-01',
    userName: 'Technician A',
    entityId: 'insp-102',
    entityName: 'Emergency Cryogenic Relief Valve RV-88',
    entityType: 'EVIDENCE',
    field: 'Defect Evidence Photo',
    oldValue: 'None',
    newValue: 'photo-valve-frost-01.jpg',
    timestamp: '09:12',
    networkState: 'OFFLINE',
    status: 'FAILED',
    errorMessage: 'Gateway Timeout 504: Payload transmission interrupted during underground traversal',
    retryCount: 2
  },
  {
    operationId: 'OP-9A10E4',
    clientId: 'client-wa1-alpha',
    userId: 'usr-tech-01',
    userName: 'Technician A',
    entityId: 'insp-101',
    entityName: 'High-Pressure Steam Boiler B-12',
    entityType: 'CHECKLIST_ITEM',
    field: 'Burner Flame Sensor',
    oldValue: 'PASS',
    newValue: 'FAIL',
    timestamp: '09:28',
    networkState: 'ONLINE',
    status: 'CONFLICT',
    conflictDetails: 'Supervisor Marcus Reid updated status to WARNING concurrently at 09:27'
  }
];

export async function getSchemaVersion(): Promise<number> {
  try {
    const meta = await db.systemMetadata.get('schemaVersion');
    return meta ? meta.value : 3;
  } catch {
    return 3;
  }
}

export async function getOfflineDbSummary() {
  try {
    const [
      inspectionsCount,
      itemsCount,
      notesCount,
      evidenceCount,
      pendingOpsCount,
      operationsCount,
      conflictsCount
    ] = await Promise.all([
      db.inspections.count(),
      db.inspectionItems.count(),
      db.notes.count(),
      db.evidenceMetadata.count(),
      db.pendingOperations.count(),
      db.operations.count(),
      db.conflicts.count()
    ]);

    const schemaVersion = await getSchemaVersion();

    return {
      schemaVersion,
      inspectionsCount,
      itemsCount,
      notesCount,
      evidenceCount,
      pendingOpsCount,
      operationsCount,
      conflictsCount,
      databaseName: db.name
    };
  } catch (err) {
    console.error('Error fetching Dexie summary:', err);
    return {
      schemaVersion: 3,
      inspectionsCount: 0,
      itemsCount: 0,
      notesCount: 0,
      evidenceCount: 0,
      pendingOpsCount: 0,
      operationsCount: 0,
      conflictsCount: 0,
      databaseName: 'WA1FieldInspectionDB'
    };
  }
}

