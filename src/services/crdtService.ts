import * as Y from 'yjs';
import type { Inspection, ChecklistItem, Defect } from '../types';

class CrdtManager {
  private docs = new Map<string, Y.Doc>();
  private clientId: string;

  constructor() {
    if (typeof window !== 'undefined' && localStorage.getItem('wa1_crdt_client_id')) {
      this.clientId = localStorage.getItem('wa1_crdt_client_id')!;
    } else {
      this.clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem('wa1_crdt_client_id', this.clientId);
      }
    }
  }

  public getClientId(): string {
    return this.clientId;
  }

  /**
   * Helper to convert uint8array to base64
   */
  public toBase64(arr: Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(arr).toString('base64');
    }
    let binary = '';
    const bytes = new Uint8Array(arr);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Helper to convert base64 to uint8array
   */
  public fromBase64(base64: string): Uint8Array {
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(base64, 'base64'));
    }
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Get or initialize a Y.Doc for an inspection
   */
  public getOrCreateDoc(inspectionId: string, initialData?: Inspection): Y.Doc {
    if (this.docs.has(inspectionId)) {
      return this.docs.get(inspectionId)!;
    }

    const doc = new Y.Doc();
    this.docs.set(inspectionId, doc);

    if (initialData) {
      this.populateDocWithInspection(doc, initialData);
    }

    return doc;
  }

  /**
   * Populate Y.Doc with initial inspection record
   */
  public populateDocWithInspection(doc: Y.Doc, insp: Inspection) {
    doc.transact(() => {
      const metaMap = doc.getMap<unknown>('meta');
      metaMap.set('id', insp.id);
      metaMap.set('code', insp.code);
      metaMap.set('title', insp.title);
      metaMap.set('equipmentId', insp.equipmentId);
      metaMap.set('equipmentName', insp.equipmentName);
      metaMap.set('facility', insp.facility || '');
      metaMap.set('zone', insp.zone || '');
      metaMap.set('status', insp.status);
      metaMap.set('score', insp.score);
      metaMap.set('riskLevel', insp.riskLevel);
      metaMap.set('generalNotes', insp.generalNotes || '');
      metaMap.set('scheduledDate', insp.scheduledDate || '');
      metaMap.set('version', insp.version || 1);
      metaMap.set('assignedTechnicianId', insp.assignedTechnicianId || '');
      metaMap.set('technicianName', insp.technicianName || '');

      const checklistMap = doc.getMap<unknown>('checklist');
      if (Array.isArray(insp.checklist)) {
        insp.checklist.forEach(item => {
          checklistMap.set(item.id, JSON.stringify(item));
        });
      }

      const defectsMap = doc.getMap<unknown>('defects');
      if (Array.isArray(insp.defects)) {
        insp.defects.forEach(defect => {
          defectsMap.set(defect.id, JSON.stringify(defect));
        });
      }

      const signaturesMap = doc.getMap<unknown>('signatures');
      if (insp.signatures) {
        Object.entries(insp.signatures).forEach(([key, val]) => {
          signaturesMap.set(key, JSON.stringify(val));
        });
      }
    });
  }

  /**
   * Export Y.Doc back to plain Inspection model
   */
  public exportDocToInspection(doc: Y.Doc): Partial<Inspection> {
    const metaMap = doc.getMap<unknown>('meta');
    const checklistMap = doc.getMap<unknown>('checklist');
    const defectsMap = doc.getMap<unknown>('defects');
    const signaturesMap = doc.getMap<unknown>('signatures');

    const checklistArr: ChecklistItem[] = [];
    checklistMap.forEach((val) => {
      try {
        if (typeof val === 'string') {
          checklistArr.push(JSON.parse(val));
        }
      } catch {
        // Skip malformed
      }
    });

    const defectsArr: Defect[] = [];
    defectsMap.forEach((val) => {
      try {
        if (typeof val === 'string') {
          defectsArr.push(JSON.parse(val));
        }
      } catch {
        // Skip malformed
      }
    });

    const signaturesObj: Record<string, { name: string; timestamp: string }> = {};
    signaturesMap.forEach((val, key) => {
      try {
        if (typeof val === 'string') {
          signaturesObj[key] = JSON.parse(val);
        }
      } catch {
        // Skip
      }
    });

    return {
      id: metaMap.get('id') as string,
      code: metaMap.get('code') as string,
      title: metaMap.get('title') as string,
      equipmentId: metaMap.get('equipmentId') as string,
      equipmentName: metaMap.get('equipmentName') as string,
      facility: metaMap.get('facility') as string,
      zone: metaMap.get('zone') as string,
      status: metaMap.get('status') as Inspection['status'],
      score: metaMap.get('score') as number,
      riskLevel: metaMap.get('riskLevel') as Inspection['riskLevel'],
      generalNotes: metaMap.get('generalNotes') as string,
      scheduledDate: metaMap.get('scheduledDate') as string,
      version: (metaMap.get('version') as number) || 1,
      assignedTechnicianId: metaMap.get('assignedTechnicianId') as string,
      technicianName: metaMap.get('technicianName') as string,
      checklist: checklistArr,
      defects: defectsArr,
      signatures: Object.keys(signaturesObj).length > 0 ? signaturesObj : undefined
    };
  }

  /**
   * Encode complete Y.Doc state as base64 string
   */
  public encodeDocState(doc: Y.Doc): string {
    const update = Y.encodeStateAsUpdate(doc);
    return this.toBase64(update);
  }

  /**
   * Apply CRDT update delta to a Y.Doc
   */
  public applyCrdtUpdate(doc: Y.Doc, base64Update: string) {
    try {
      const updateBytes = this.fromBase64(base64Update);
      Y.applyUpdate(doc, updateBytes, 'remote');
    } catch (err) {
      console.warn('[WA-1 CRDT] Failed to apply update delta:', err);
    }
  }

  /**
   * Perform deterministic Yjs CRDT merge between local inspection and remote inspection / CRDT delta
   */
  public mergeInspectionsWithCrdt(localInsp: Inspection, remoteInsp: Inspection, remoteCrdtUpdate?: string): Inspection {
    const localDoc = this.getOrCreateDoc(localInsp.id, localInsp);

    // Apply remote CRDT delta if present
    if (remoteCrdtUpdate) {
      this.applyCrdtUpdate(localDoc, remoteCrdtUpdate);
    } else {
      // Build temporary remote doc and merge update state into localDoc
      const tempRemoteDoc = new Y.Doc();
      this.populateDocWithInspection(tempRemoteDoc, remoteInsp);
      const remoteStateUpdate = Y.encodeStateAsUpdate(tempRemoteDoc);
      Y.applyUpdate(localDoc, remoteStateUpdate, 'remote-merge');
    }

    const mergedPartial = this.exportDocToInspection(localDoc);

    // Combine local version clocks deterministically
    const maxVersion = Math.max(localInsp.version || 1, remoteInsp.version || 1, (mergedPartial.version || 1));

    const mergedInsp: Inspection = {
      ...localInsp,
      ...remoteInsp,
      ...mergedPartial,
      version: maxVersion,
      lastModified: new Date().toISOString()
    };

    return mergedInsp;
  }
}

export const crdtManager = new CrdtManager();
