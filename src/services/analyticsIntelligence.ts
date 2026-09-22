import type { 
  Inspection, 
  Equipment, 
  EvidenceReliabilityScore, 
  PredictiveAlert, 
  SmartPriorityAssessment, 
  SmartPriorityLevel 
} from '../types';

/**
 * Calculates evidence reliability percentage (0 - 100%) based on 5 parameters:
 * Photo, Notes, Timestamp, GPS, and Inspection History
 */
export function calculateEvidenceReliability(
  inspection: Inspection,
  history: Inspection[] = []
): EvidenceReliabilityScore {
  const reasons: string[] = [];

  // 1. PHOTO FACTOR (Max 25 pts)
  const photos = inspection.evidencePhotos || [];
  let photoScore = 0;
  let photoDetails = 'No visual photos attached';

  if (photos.length >= 2) {
    photoScore = 25;
    photoDetails = `${photos.length} high-res photos attached with evidence metadata`;
  } else if (photos.length === 1) {
    photoScore = 18;
    photoDetails = '1 photo evidence attached';
  } else {
    reasons.push('Missing photo evidence reduces reliability score (-25%)');
  }

  // 2. NOTES FACTOR (Max 20 pts)
  const generalNotesLen = (inspection.generalNotes || '').trim().length;
  const checklistNotesLen = inspection.checklist.reduce(
    (acc, item) => acc + (item.notes?.length || 0) + (item.failNotes?.length || 0), 0
  );
  const totalNotesLen = generalNotesLen + checklistNotesLen;

  let notesScore = 0;
  let notesDetails = 'Minimal or no text notes provided';

  if (totalNotesLen > 80) {
    notesScore = 20;
    notesDetails = 'Comprehensive technical notes and observations logged';
  } else if (totalNotesLen > 20) {
    notesScore = 12;
    notesDetails = 'Basic inspection notes logged';
  } else {
    reasons.push('Brief or missing technical notes (-12%)');
  }

  // 3. TIMESTAMP FACTOR (Max 20 pts)
  let timestampScore = 0;
  let timestampDetails = 'Timestamp verification pending';

  const dateStr = inspection.completedDate || inspection.lastModified || inspection.scheduledDate;
  if (dateStr && !isNaN(new Date(dateStr).getTime())) {
    timestampScore = 20;
    timestampDetails = `Verified ISO timestamp (${new Date(dateStr).toLocaleTimeString()})`;
  } else {
    reasons.push('Invalid or missing timestamp telemetry (-20%)');
  }

  // 4. GPS FACTOR (Max 20 pts)
  let gpsScore = 0;
  let gpsDetails = 'GPS location telemetry unverified';

  const gps = inspection.gpsLocation;
  if (gps && gps.available && gps.latitude && gps.longitude) {
    const accuracy = gps.accuracy || 10;
    if (accuracy <= 15) {
      gpsScore = 20;
      gpsDetails = `High-accuracy GPS fix (±${accuracy}m)`;
    } else if (accuracy <= 30) {
      gpsScore = 15;
      gpsDetails = `Standard GPS fix (±${accuracy}m)`;
    } else {
      gpsScore = 10;
      gpsDetails = `Degraded GPS accuracy (±${accuracy}m)`;
    }
  } else {
    reasons.push('Missing physical GPS coordinates (-20%)');
  }

  // 5. INSPECTION HISTORY ALIGNMENT (Max 15 pts)
  let historyScore = 0;
  let historyDetails = 'First baseline inspection record';

  const assetHistory = history.filter(h => h.equipmentId === inspection.equipmentId);
  if (assetHistory.length > 0) {
    // Check if technician signature or past audits exist
    const signed = !!inspection.signatures?.technician?.name;
    if (signed) {
      historyScore = 15;
      historyDetails = `Corroborated by ${assetHistory.length} historical records and digital sign-off`;
    } else {
      historyScore = 10;
      historyDetails = `Cross-referenced with ${assetHistory.length} historical records`;
    }
  } else {
    historyScore = 12;
    historyDetails = 'Initial baseline audit entry recorded';
  }

  const totalScore = photoScore + notesScore + timestampScore + gpsScore + historyScore;

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    factors: {
      photo: { score: photoScore, maxScore: 25, details: photoDetails },
      notes: { score: notesScore, maxScore: 20, details: notesDetails },
      timestamp: { score: timestampScore, maxScore: 20, details: timestampDetails },
      gps: { score: gpsScore, maxScore: 20, details: gpsDetails },
      history: { score: historyScore, maxScore: 15, details: historyDetails }
    },
    reasons
  };
}

/**
 * Scans historical inspections to generate realistic, data-grounded predictive alerts
 * for repeated equipment problems (e.g. pressure drops, seal leaks, repeated failures).
 */
export function generatePredictiveAlerts(
  equipments: Equipment[],
  inspections: Inspection[]
): PredictiveAlert[] {
  const alerts: PredictiveAlert[] = [];

  equipments.forEach((eq) => {
    const eqInspections = inspections
      .filter((i) => i.equipmentId === eq.id)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    // 1. Check for pressure or numerical decline trend
    const pressureValues: { date: string; val: number; raw: string }[] = [];
    eqInspections.forEach((i) => {
      i.checklist.forEach((c) => {
        if (c.measuredValue && c.title.toLowerCase().includes('pressure')) {
          const num = parseFloat(c.measuredValue.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) {
            pressureValues.push({ date: i.scheduledDate.split('T')[0], val: num, raw: c.measuredValue });
          }
        }
      });
    });

    if (pressureValues.length >= 2) {
      let isDeclining = true;
      for (let k = 1; k < pressureValues.length; k++) {
        if (pressureValues[k].val >= pressureValues[k - 1].val) {
          isDeclining = false;
          break;
        }
      }

      if (isDeclining) {
        const trendString = pressureValues.map(p => `${p.date}: ${p.raw}`);
        alerts.push({
          id: `pred-${eq.id}-pressure`,
          equipmentId: eq.id,
          equipmentName: eq.name,
          equipmentTag: eq.tag,
          facility: eq.facility,
          summary: `Pressure has steadily declined across the last ${pressureValues.length} consecutive inspections.`,
          historyTrend: trendString,
          risk: eq.status === 'CRITICAL_OFFLINE' ? 'CRITICAL' : 'HIGH',
          suggestedAttention: 'Perform relief valve diagnostic, check intake manifold seals, and purge pressure lines before next cycle.',
          detectedAt: new Date().toISOString(),
          dataPointsCount: pressureValues.length
        });
      }
    }

    // 2. Check for repeated failures on specific checklist categories
    const failCounts: Record<string, { count: number; items: string[] }> = {};
    eqInspections.forEach((i) => {
      i.checklist.forEach((c) => {
        if (c.status === 'FAIL' || c.status === 'WARNING') {
          if (!failCounts[c.category]) {
            failCounts[c.category] = { count: 0, items: [] };
          }
          failCounts[c.category].count += 1;
          failCounts[c.category].items.push(`${i.scheduledDate.split('T')[0]}: ${c.title} (${c.status})`);
        }
      });
    });

    Object.entries(failCounts).forEach(([category, data]) => {
      if (data.count >= 2) {
        alerts.push({
          id: `pred-${eq.id}-${category.toLowerCase().replace(/\s+/g, '-')}`,
          equipmentId: eq.id,
          equipmentName: eq.name,
          equipmentTag: eq.tag,
          facility: eq.facility,
          summary: `Repeated failures detected in "${category}" across ${data.count} inspection cycles.`,
          historyTrend: data.items.slice(-4),
          risk: data.count >= 3 ? 'CRITICAL' : 'HIGH',
          suggestedAttention: `Schedule comprehensive overhaul for ${category} component block and replace worn seal gaskets.`,
          detectedAt: new Date().toISOString(),
          dataPointsCount: data.count
        });
      }
    });

    // 3. Fallback baseline predictive alert for equipment needing maintenance if no trend found yet
    if (alerts.filter(a => a.equipmentId === eq.id).length === 0) {
      if (eq.status === 'NEEDS_MAINTENANCE' || eq.healthScore < 80) {
        alerts.push({
          id: `pred-${eq.id}-health`,
          equipmentId: eq.id,
          equipmentName: eq.name,
          equipmentTag: eq.tag,
          facility: eq.facility,
          summary: `Asset health score degraded to ${eq.healthScore}% due to accumulated wear indicators.`,
          historyTrend: [
            `Last Inspection: ${eq.lastInspectionDate}`,
            `Next Due: ${eq.nextScheduledDate}`,
            `Current Health: ${eq.healthScore}%`
          ],
          risk: eq.healthScore < 60 ? 'CRITICAL' : 'MEDIUM',
          suggestedAttention: 'Schedule preventative maintenance checkup and recalibrate baseline operating tolerance.',
          detectedAt: new Date().toISOString(),
          dataPointsCount: eqInspections.length || 1
        });
      }
    }
  });

  return alerts;
}

/**
 * Calculates a data-grounded Smart Priority rating (CRITICAL, HIGH, MEDIUM, NORMAL)
 * using failure history, defect severity, equipment age, missed inspections, and repeated failures.
 */
export function calculateSmartPriority(
  equipment: Equipment,
  inspections: Inspection[]
): SmartPriorityAssessment {
  const reasons: string[] = [];
  let score = 0;

  const assetInspections = inspections.filter(i => i.equipmentId === equipment.id);

  // 1. Failure History
  const failedCount = assetInspections.filter(i => i.status === 'FAILED').length;
  const defectCount = assetInspections.reduce((acc, i) => acc + i.defects.length, 0);
  const failureHistoryCount = equipment.failureHistoryCount ?? (failedCount + defectCount);

  if (failureHistoryCount >= 3) {
    score += 25;
    reasons.push(`${failureHistoryCount} historical failures/defects recorded`);
  } else if (failureHistoryCount >= 1) {
    score += 15;
    reasons.push(`${failureHistoryCount} past defect logged`);
  }

  // 2. Highest Defect Severity
  let highestSeverity = 'NONE';
  let hasCritical = false;
  let hasHigh = false;

  assetInspections.forEach(i => {
    i.defects.forEach(d => {
      if (d.severity === 'CRITICAL') hasCritical = true;
      if (d.severity === 'HIGH') hasHigh = true;
    });
  });

  if (hasCritical || equipment.status === 'CRITICAL_OFFLINE' || equipment.criticality === 'HIGH') {
    highestSeverity = 'CRITICAL';
    score += 30;
    reasons.push('High criticality asset or active critical defect');
  } else if (hasHigh || equipment.status === 'NEEDS_MAINTENANCE') {
    highestSeverity = 'HIGH';
    score += 20;
    reasons.push('Maintenance required or high-severity seal warning');
  } else {
    highestSeverity = 'MEDIUM';
    score += 10;
  }

  // 3. Equipment Age
  const currentYear = new Date().getFullYear();
  const mfgYear = equipment.manufactureYear || 2018;
  const equipmentAgeYears = Math.max(1, currentYear - mfgYear);

  if (equipmentAgeYears >= 8) {
    score += 20;
    reasons.push(`Aging equipment asset (${equipmentAgeYears} years in service)`);
  } else if (equipmentAgeYears >= 4) {
    score += 10;
    reasons.push(`Mid-lifecycle equipment (${equipmentAgeYears} years)`);
  }

  // 4. Missed Inspections / Overdue Days
  const now = new Date();
  const nextDueDate = new Date(equipment.nextScheduledDate);
  const diffTime = now.getTime() - nextDueDate.getTime();
  const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const totalMissed = (equipment.missedInspectionsCount || 0) + (daysOverdue > 0 ? 1 : 0);

  if (daysOverdue > 7 || totalMissed >= 2) {
    score += 20;
    reasons.push(`Inspection overdue by ${daysOverdue} days (${totalMissed} missed cycles)`);
  } else if (daysOverdue > 0) {
    score += 10;
    reasons.push(`Inspection overdue by ${daysOverdue} day(s)`);
  }

  // 5. Repeated Failures
  const repeatedFailuresCount = equipment.repeatedFailuresCount ?? (failedCount >= 2 ? failedCount : 0);
  if (repeatedFailuresCount > 0) {
    score += 15;
    reasons.push(`${repeatedFailuresCount} repeated failure cycles detected`);
  }

  // Determine Smart Priority Level
  let priority: SmartPriorityLevel = 'NORMAL';
  if (score >= 65) {
    priority = 'CRITICAL';
  } else if (score >= 45) {
    priority = 'HIGH';
  } else if (score >= 25) {
    priority = 'MEDIUM';
  } else {
    priority = 'NORMAL';
  }

  return {
    priority,
    score: Math.min(100, score),
    metrics: {
      failureHistoryCount,
      highestSeverity,
      equipmentAgeYears,
      daysOverdue,
      repeatedFailuresCount
    },
    reasons
  };
}
