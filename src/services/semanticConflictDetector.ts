import type { Inspection, ConflictItem, PendingOperationRecord } from '../types';

export function detectSemanticConflicts(
  localInsp: Inspection,
  remoteInsp: Inspection,
  localOps: PendingOperationRecord[] = []
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];

  // Find local operation for this inspection
  const matchingOp = localOps.find(op => op.entityId === localInsp.id);

  // 1. Checklist Item Semantic Conflicts
  if (Array.isArray(localInsp.checklist) && Array.isArray(remoteInsp.checklist)) {
    for (const chkLoc of localInsp.checklist) {
      const chkRem = remoteInsp.checklist.find(
        item => item.id === chkLoc.id || item.title === chkLoc.title
      );

      if (chkRem) {
        const isLocFail = chkLoc.status === 'FAIL' || chkLoc.status === 'WARNING';
        const isRemFail = chkRem.status === 'FAIL' || chkRem.status === 'WARNING';
        const isLocPass = chkLoc.status === 'PASS';
        const isRemPass = chkRem.status === 'PASS';

        // Opposing status evaluations (e.g., PASS vs FAIL)
        const hasStatusContradiction = (isLocFail && isRemPass) || (isLocPass && isRemFail);
        const hasNotesContradiction = chkLoc.status !== chkRem.status && !!chkLoc.notes && !!chkRem.notes && chkLoc.notes !== chkRem.notes;

        if (hasStatusContradiction || hasNotesContradiction) {
          const conflictRecord: ConflictItem = {
            id: `conf-sem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            inspectionId: localInsp.id,
            inspectionCode: localInsp.code,
            equipmentName: localInsp.equipmentName,
            field: `Checklist Item: "${chkLoc.title}"`,
            localValue: `${chkLoc.status}${chkLoc.measuredValue ? ` (${chkLoc.measuredValue})` : ''} - "${chkLoc.notes || 'Local assessment'}"`,
            serverValue: `${chkRem.status}${chkRem.measuredValue ? ` (${chkRem.measuredValue})` : ''} - "${chkRem.notes || 'Remote assessment'}"`,
            detectedAt: new Date().toISOString(),
            technicianName: localInsp.technicianName || 'Technician A',
            supervisorName: remoteInsp.technicianName || remoteInsp.supervisorName || 'Technician B',
            status: 'ACTIVE',
            conflictType: 'SEMANTIC_BUSINESS_CONFLICT',

            // Preserved fields as required
            localUser: localInsp.technicianName || 'Technician A (Local)',
            remoteUser: remoteInsp.technicianName || remoteInsp.supervisorName || 'Technician B (Remote)',
            localTimestamp: chkLoc.timestamp || localInsp.lastModified || new Date().toISOString(),
            remoteTimestamp: chkRem.timestamp || remoteInsp.lastModified || new Date().toISOString(),
            localNotes: chkLoc.notes || localInsp.generalNotes || 'No local notes provided',
            remoteNotes: chkRem.notes || remoteInsp.generalNotes || 'No remote notes provided',
            localEvidence: chkLoc.evidencePhotoUrl
              ? [{ id: 'ev-loc-01', url: chkLoc.evidencePhotoUrl, description: chkLoc.evidenceDescription || 'Local field evidence photo', caption: chkLoc.evidenceDescription || 'Local field evidence photo', timestamp: chkLoc.timestamp || localInsp.lastModified }]
              : (localInsp.evidencePhotos || []),
            remoteEvidence: chkRem.evidencePhotoUrl
              ? [{ id: 'ev-rem-01', url: chkRem.evidencePhotoUrl, description: chkRem.evidenceDescription || 'Remote server evidence photo', caption: chkRem.evidenceDescription || 'Remote server evidence photo', timestamp: chkRem.timestamp || remoteInsp.lastModified }]
              : (remoteInsp.evidencePhotos || []),
            localGps: localInsp.gpsLocation || { available: true, latitude: 37.7749, longitude: -122.4194, accuracy: 4.5, address: 'Sector 4 Field Bay (Local)' },
            remoteGps: remoteInsp.gpsLocation || { available: true, latitude: 37.7758, longitude: -122.4181, accuracy: 6.2, address: 'Central Terminal (Remote)' },
            localOperationId: matchingOp?.id || `op-loc-${localInsp.id}`,
            remoteOperationId: `op-rem-${remoteInsp.id}`,
            checklistItemId: chkLoc.id,
            checklistItemLabel: chkLoc.title
          };

          conflicts.push(conflictRecord);
        }
      }
    }
  }

  // 2. Overall Inspection Status Semantic Conflicts
  if (localInsp.status !== remoteInsp.status) {
    const isLocTerminal = localInsp.status === 'PASSED' || localInsp.status === 'FAILED';
    const isRemTerminal = remoteInsp.status === 'PASSED' || remoteInsp.status === 'FAILED';

    if (isLocTerminal && isRemTerminal && localInsp.status !== remoteInsp.status) {
      const conflictRecord: ConflictItem = {
        id: `conf-sem-insp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        inspectionId: localInsp.id,
        inspectionCode: localInsp.code,
        equipmentName: localInsp.equipmentName,
        field: `Overall Inspection Evaluation`,
        localValue: `Status: ${localInsp.status} (Score: ${localInsp.score}) - "${localInsp.generalNotes || 'Local finalization'}"`,
        serverValue: `Status: ${remoteInsp.status} (Score: ${remoteInsp.score}) - "${remoteInsp.generalNotes || 'Remote finalization'}"`,
        detectedAt: new Date().toISOString(),
        technicianName: localInsp.technicianName || 'Technician A',
        supervisorName: remoteInsp.technicianName || remoteInsp.supervisorName || 'Technician B',
        status: 'ACTIVE',
        conflictType: 'SEMANTIC_BUSINESS_CONFLICT',

        localUser: localInsp.technicianName || 'Technician A (Local)',
        remoteUser: remoteInsp.technicianName || remoteInsp.supervisorName || 'Technician B (Remote)',
        localTimestamp: localInsp.completedDate || localInsp.lastModified || new Date().toISOString(),
        remoteTimestamp: remoteInsp.completedDate || remoteInsp.lastModified || new Date().toISOString(),
        localNotes: localInsp.generalNotes || 'No local inspection notes',
        remoteNotes: remoteInsp.generalNotes || 'No remote inspection notes',
        localEvidence: localInsp.evidencePhotos || [],
        remoteEvidence: remoteInsp.evidencePhotos || [],
        localGps: localInsp.gpsLocation || { available: true, latitude: 37.7749, longitude: -122.4194, accuracy: 4.5, address: 'Sector 4 Field Bay' },
        remoteGps: remoteInsp.gpsLocation || { available: true, latitude: 37.7758, longitude: -122.4181, accuracy: 6.2, address: 'Central Station' },
        localOperationId: matchingOp?.id || `op-loc-${localInsp.id}`,
        remoteOperationId: `op-rem-${remoteInsp.id}`
      };

      conflicts.push(conflictRecord);
    }
  }

  return conflicts;
}
