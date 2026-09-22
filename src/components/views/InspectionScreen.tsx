import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Camera, 
  Upload, 
  MapPin, 
  Save, 
  Clock, 
  Layers, 
  ShieldAlert, 
  FileText, 
  Trash2, 
  RefreshCw, 
  Navigation, 
  Check, 
  Info,
  Calendar,
  Sparkles,
  Database
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useNetwork } from '../../context/NetworkContext';
import { StatusBadge } from '../common/StatusBadge';
import { ResumableUploader } from '../common/ResumableUploader';
import { 
  calculateEvidenceReliability, 
  generatePredictiveAlerts 
} from '../../services/analyticsIntelligence';
import type { 
  Inspection, 
  ChecklistItem, 
  RiskLevel, 
  EvidencePhoto, 
  InspectionGpsLocation 
} from '../../types';

// The 4 standardized mandatory checklist requirements
interface StandardChecklistDefinition {
  key: string;
  title: string;
  requirement: string;
  defaultReasons: string[];
}

const MANDATORY_ITEMS: StandardChecklistDefinition[] = [
  {
    key: 'pressure-gauge',
    title: 'Pressure Gauge',
    requirement: 'Operating PSI reading must fall strictly within certified green arc tolerance; gauge glass intact with zero dampening oil leaks.',
    defaultReasons: [
      'Pressure below minimum operating range',
      'Pressure exceeding maximum safety threshold',
      'Gauge needle stuck or erratic oscillation',
      'Dial glass cracked / moisture ingress',
      'Gasket dampening fluid leaking'
    ]
  },
  {
    key: 'physical-damage',
    title: 'Physical Damage',
    requirement: 'Enclosure and structural housing free of impact dents, weld micro-fractures, severe oxidation, or missing mounting hardware.',
    defaultReasons: [
      'Visible casing dent / deformation',
      'Hairline fracture on structural weld',
      'Severe corrosion / pitting deeper than 0.5mm',
      'Missing or sheared mounting bolts',
      'Thermal scorching or arc flash discoloration'
    ]
  },
  {
    key: 'safety-seal',
    title: 'Safety Seal',
    requirement: 'Tamper-evident copper/lead wire and plastic lock seal fully intact, legible serial stamping, and properly anchored.',
    defaultReasons: [
      'Tamper wire severed or absent',
      'Plastic seal tag fractured or missing',
      'Seal serial number does not match asset registry',
      'Anchor cotter pin unseated',
      'Evidence of unauthorized tampering'
    ]
  },
  {
    key: 'expiry-date',
    title: 'Expiry Date',
    requirement: 'Next scheduled hydrostatic test or certification tag has not lapsed; inspection collar valid for current operational quarter.',
    defaultReasons: [
      'Hydrostatic test certificate expired',
      'Calibration tag illegible or water damaged',
      'Annual third-party certification overdue',
      'Service collar expired',
      'Missing regulatory compliance stamp'
    ]
  }
];

interface InspectionScreenProps {
  inspectionId?: string;
  onBack?: () => void;
}

export const InspectionScreen: React.FC<InspectionScreenProps> = ({
  inspectionId,
  onBack
}) => {
  const { currentUser } = useAuth();
  const { navigate } = useRouter();
  const { 
    inspections, 
    equipments, 
    saveInspection, 
    selectedInspection, 
    setSelectedInspection 
  } = useInspections();
  const { isOnline, toggleSimulatedOffline, unsyncedChangesCount } = useNetwork();

  // Find target inspection or fallback to selected or active session ID or first
  const savedActiveId = typeof window !== 'undefined' ? localStorage.getItem('wa1_active_inspection_id') : null;
  const activeInspection = 
    inspections.find(i => i.id === inspectionId) ||
    selectedInspection ||
    (savedActiveId ? inspections.find(i => i.id === savedActiveId) : undefined) ||
    inspections[0];

  // Matched Equipment Details
  const equipment = equipments.find(e => e.id === activeInspection?.equipmentId) || {
    id: activeInspection?.equipmentId || 'eq-unknown',
    name: activeInspection?.equipmentName || 'Industrial Asset',
    tag: activeInspection?.equipmentId || 'TAG-001',
    facility: activeInspection?.facility || 'Alpha Sector',
    location: activeInspection?.zone || 'Zone 1',
    lastInspectionDate: '2026-09-20',
    status: 'OPERATIONAL' as const,
    criticality: 'HIGH' as const,
    category: 'Industrial Machinery',
    nextScheduledDate: '2026-10-01',
    healthScore: 85
  };

  // 1. Checklist State: Initialize with the 4 mandatory items
  const [checklistMap, setChecklistMap] = useState<Record<string, {
    status: 'PASS' | 'FAIL' | 'NOT_CHECKED';
    reason: string;
    notes: string;
    severity: RiskLevel;
    evidencePhotoUrl?: string;
    evidenceDescription?: string;
  }>>(() => {
    const initial: Record<string, any> = {};
    MANDATORY_ITEMS.forEach(item => {
      const existing = activeInspection?.checklist?.find(
        c => c.title.toLowerCase().includes(item.title.toLowerCase())
      );
      initial[item.title] = {
        status: existing?.status === 'PASS' ? 'PASS' : existing?.status === 'FAIL' ? 'FAIL' : 'NOT_CHECKED',
        reason: existing?.failReason || item.defaultReasons[0],
        notes: existing?.failNotes || existing?.notes || '',
        severity: existing?.failSeverity || 'HIGH',
        evidencePhotoUrl: existing?.evidencePhotoUrl || existing?.photoUrl || '',
        evidenceDescription: existing?.evidenceDescription || ''
      };
    });
    return initial;
  });

  // 2. Large Notes State
  const [generalNotes, setGeneralNotes] = useState<string>(
    activeInspection?.generalNotes || ''
  );

  // 3. Photo & Evidence State
  const [photos, setPhotos] = useState<EvidencePhoto[]>(
    activeInspection?.evidencePhotos || []
  );
  const [evidenceCaption, setEvidenceCaption] = useState<string>('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. GPS State
  const [gps, setGps] = useState<InspectionGpsLocation>({
    available: false,
    statusText: 'Acquiring GPS fix...'
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // 5. Save Status & Banner feedback
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync state from Dexie IndexedDB when active inspection updates or page reloads
  useEffect(() => {
    if (!activeInspection) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem('wa1_active_inspection_id', activeInspection.id);
    }

    const initial: Record<string, any> = {};
    MANDATORY_ITEMS.forEach(item => {
      const existing = activeInspection.checklist?.find(
        c => c.title.toLowerCase().includes(item.title.toLowerCase())
      );
      initial[item.title] = {
        status: existing?.status === 'PASS' ? 'PASS' : existing?.status === 'FAIL' ? 'FAIL' : 'NOT_CHECKED',
        reason: existing?.failReason || item.defaultReasons[0],
        notes: existing?.failNotes || existing?.notes || '',
        severity: existing?.failSeverity || 'HIGH',
        evidencePhotoUrl: existing?.evidencePhotoUrl || existing?.photoUrl || '',
        evidenceDescription: existing?.evidenceDescription || ''
      };
    });
    setChecklistMap(initial);
    setGeneralNotes(activeInspection.generalNotes || '');
    setPhotos(activeInspection.evidencePhotos || []);
    if (activeInspection.gpsLocation) {
      setGps(activeInspection.gpsLocation);
    }
  }, [activeInspection?.id, activeInspection?.lastModified]);

  // Request browser geolocation on mount
  const acquireLocation = () => {
    if (!('geolocation' in navigator)) {
      setGps({
        available: false,
        statusText: 'Location unavailable: Geolocation API not supported by this client.'
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setGps({
          available: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date(position.timestamp).toISOString(),
          statusText: 'Location available'
        });
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = 'Location unavailable';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location unavailable: GPS permission denied by user/browser';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location unavailable: Sensor signal not detected in facility enclosure';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location unavailable: Acquisition timed out';
            break;
        }
        setGps({
          available: false,
          statusText: errorMsg
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    acquireLocation();
  }, []);

  // Update a checklist item status
  const handleSetStatus = (itemTitle: string, status: 'PASS' | 'FAIL') => {
    setChecklistMap(prev => ({
      ...prev,
      [itemTitle]: {
        ...prev[itemTitle],
        status: prev[itemTitle]?.status === status ? 'NOT_CHECKED' : status
      }
    }));
  };

  // Update fail reason, notes, severity
  const handleUpdateFailField = (
    itemTitle: string, 
    field: 'reason' | 'notes' | 'severity' | 'evidencePhotoUrl' | 'evidenceDescription', 
    value: any
  ) => {
    setChecklistMap(prev => ({
      ...prev,
      [itemTitle]: {
        ...prev[itemTitle],
        [field]: value
      }
    }));
  };

  // Photo Selection Handling
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreviewUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Add photo to evidence list
  const handleAddEvidencePhoto = () => {
    if (!photoPreviewUrl) return;

    const newPhoto: EvidencePhoto = {
      id: 'photo-' + Date.now(),
      url: photoPreviewUrl,
      description: evidenceCaption.trim() || 'Field inspection observation evidence',
      timestamp: new Date().toISOString()
    };

    setPhotos(prev => [newPhoto, ...prev]);
    setPhotoPreviewUrl(null);
    setEvidenceCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick preset sample photo for quick testing if device has no camera
  const handleUsePresetPhoto = (sampleUrl: string, sampleDesc: string) => {
    const newPhoto: EvidencePhoto = {
      id: 'photo-' + Date.now(),
      url: sampleUrl,
      description: sampleDesc,
      timestamp: new Date().toISOString()
    };
    setPhotos(prev => [newPhoto, ...prev]);
  };

  // Remove photo
  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  // Handle Save Inspection
  const handleSaveInspection = async () => {
    if (!activeInspection) return;
    setIsSaving(true);

    // Build updated checklist items
    const updatedChecklistItems: ChecklistItem[] = MANDATORY_ITEMS.map((item, idx) => {
      const state = checklistMap[item.title] || {
        status: 'NOT_CHECKED',
        reason: item.defaultReasons[0],
        notes: '',
        severity: 'HIGH'
      };

      return {
        id: `chk-std-${idx + 1}`,
        category: 'Field Integrity Standards',
        title: item.title,
        requirement: item.requirement,
        status: state.status,
        notes: state.status === 'FAIL' ? state.notes : state.status === 'PASS' ? 'Verified operational' : '',
        failReason: state.status === 'FAIL' ? state.reason : undefined,
        failNotes: state.status === 'FAIL' ? state.notes : undefined,
        failSeverity: state.status === 'FAIL' ? state.severity : undefined,
        evidencePhotoUrl: state.evidencePhotoUrl || undefined,
        evidenceDescription: state.evidenceDescription || undefined,
        timestamp: new Date().toISOString()
      };
    });

    // Check if any item failed to record defects
    const newDefects = updatedChecklistItems
      .filter(i => i.status === 'FAIL')
      .map(item => ({
        id: 'def-' + item.id + '-' + Date.now(),
        severity: item.failSeverity || 'HIGH',
        title: `${item.title}: ${item.failReason || 'Defect Detected'}`,
        description: item.failNotes || item.notes || `Technician flagged ${item.title} as FAILED during mobile inspection audit.`,
        recommendedAction: 'Immediate component service overhaul or lockout required.',
        photoUrl: item.evidencePhotoUrl,
        timestamp: new Date().toISOString(),
        resolved: false
      }));

    const updatedInspection: Inspection = {
      ...activeInspection,
      checklist: updatedChecklistItems,
      defects: [...(activeInspection.defects || []).filter(d => !d.id.startsWith('def-chk-std')), ...newDefects],
      generalNotes,
      evidencePhotos: photos,
      gpsLocation: gps,
      // Strictly do not claim data is synced yet:
      syncState: 'PENDING',
      offlineDraft: true,
      lastModified: new Date().toISOString(),
      signatures: {
        ...activeInspection.signatures,
        technician: {
          name: currentUser?.name || 'Alex Vance',
          timestamp: new Date().toISOString()
        }
      }
    };

    try {
      await saveInspection(updatedInspection);
      setSaveSuccessMessage('Inspection successfully saved to local IndexedDB! Sync Status: PENDING (Data is safely queued for synchronization).');
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 6000);
    } catch (err) {
      console.error('Failed to save inspection:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturn = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/technician/dashboard');
    }
  };

  // Calculate quick summary metrics
  const checkedCount = Object.values(checklistMap).filter(v => v.status !== 'NOT_CHECKED').length;
  const failCount = Object.values(checklistMap).filter(v => v.status === 'FAIL').length;
  const passCount = Object.values(checklistMap).filter(v => v.status === 'PASS').length;

  // Calculate Evidence Reliability & Predictive Alerts
  const currentReliability = activeInspection
    ? calculateEvidenceReliability({
        ...activeInspection,
        evidencePhotos: photos,
        generalNotes,
        gpsLocation: gps
      }, inspections)
    : { score: 92, factors: {} as any, reasons: [] };

  const eqPredictiveAlerts = generatePredictiveAlerts(equipments, inspections)
    .filter(a => a.equipmentId === (activeInspection?.equipmentId || equipment.id));

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-28 md:pb-16 font-sans">
      {/* Top Mobile-First Navigation Header */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={handleReturn}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="text-center truncate">
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-600">
              {activeInspection?.code || 'INS-2026-WORK'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Field Audit
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate font-display">
            {activeInspection?.equipmentName || equipment.name}
          </h1>
        </div>

        {/* Local Storage Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-mono font-semibold shrink-0">
          <Database className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">Offline Mode:</span>
          <span>Pending Sync</span>
        </div>
      </div>

      {/* Save Success Notice (Strictly not claiming synced) */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold text-emerald-950">Draft Saved to Device Storage (Dexie IndexedDB)</p>
            <p className="text-emerald-800 mt-0.5">{saveSuccessMessage}</p>
          </div>
        </div>
      )}

      {/* OFFLINE PERSISTENCE 6-STEP INTERACTIVE VERIFICATION CARD */}
      <div 
        id="offline-demo-panel"
        className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700 shadow-md space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
              isOnline 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-rose-600 text-white border-rose-400'
            }`}>
              {isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
            </span>
            <span className="font-bold text-sm tracking-tight">Offline-First Verification Demo</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="offline-demo-toggle-net"
              onClick={toggleSimulatedOffline}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs ${
                isOnline
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
              }`}
            >
              {isOnline ? '🔴 Turn Internet OFF' : '🟢 Turn Internet ON'}
            </button>
            <button
              id="offline-demo-refresh-btn"
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 flex items-center gap-1.5 transition active:scale-95"
              title="Test Dexie persistence by refreshing the browser"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Page</span>
            </button>
          </div>
        </div>

        {/* 6 Step Progress Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-slate-700/80 text-[11px]">
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-blue-400 font-bold font-mono block">1. Open</span>
            <span className="text-slate-300">Inspection active</span>
          </div>
          <div className={`p-2 rounded-lg border transition ${!isOnline ? 'bg-rose-950/80 border-rose-600 text-rose-200' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
            <span className="font-bold font-mono block">2. Turn OFF</span>
            <span>{!isOnline ? '✓ Offline mode' : 'Click "Turn OFF"'}</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-blue-400 font-bold font-mono block">3. Edit</span>
            <span className="text-slate-300">{checkedCount}/4 checked</span>
          </div>
          <div className={`p-2 rounded-lg border transition ${unsyncedChangesCount > 0 ? 'bg-amber-950/60 border-amber-600 text-amber-200' : 'bg-slate-800/80 border-slate-700 text-slate-300'}`}>
            <span className="font-bold font-mono block">4. Save</span>
            <span>Click &apos;Save Inspection&apos;</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-blue-400 font-bold font-mono block">5. Refresh</span>
            <span className="text-slate-300">Click &apos;Refresh Page&apos;</span>
          </div>
          <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/80 text-emerald-200">
            <span className="text-emerald-400 font-bold font-mono block">6. Persists!</span>
            <span>Dexie IndexedDB</span>
          </div>
        </div>
      </div>

      {/* 1. EQUIPMENT INFORMATION CARD */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-display">
              Equipment Information
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            ID: <strong className="text-slate-800">{activeInspection?.equipmentId || equipment.id}</strong>
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
          {/* Equipment Name */}
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] font-medium block">Equipment Name</span>
            <p className="font-bold text-slate-900 text-base leading-snug">
              {activeInspection?.equipmentName || equipment.name}
            </p>
            <span className="text-[11px] font-mono text-slate-500">
              Tag: {equipment.tag}
            </span>
          </div>

          {/* Equipment ID & Location */}
          <div className="space-y-1">
            <span className="text-slate-500 text-[11px] font-medium block">Equipment ID & Location</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{activeInspection?.facility || equipment.facility}</span>
            </div>
            <p className="text-slate-600 text-xs">
              Zone: {activeInspection?.zone || equipment.location}
            </p>
          </div>

          {/* Last Inspection & Previous Status */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-slate-500 text-[11px] font-medium block">Last Inspection & Status</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-800">
                {equipment.lastInspectionDate || '2026-09-20'}
              </span>
            </div>
            <div className="pt-1 flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Previous Status:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                equipment.status === 'OPERATIONAL' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : equipment.status === 'NEEDS_MAINTENANCE'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {equipment.status}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Progress Bar & Evidence Reliability Indicator */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Checklist Completed:</span>
            <span className="font-mono font-bold text-slate-900">{checkedCount} of 4</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-mono font-bold text-[11px] border border-blue-200">
              Evidence Reliability: {currentReliability.score}%
            </span>

            {passCount > 0 && (
              <span className="text-emerald-700 font-semibold font-mono text-[11px] flex items-center gap-1">
                <Check className="w-3 h-3" /> {passCount} Pass
              </span>
            )}
            {failCount > 0 && (
              <span className="text-rose-700 font-semibold font-mono text-[11px] flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {failCount} Fail
              </span>
            )}
          </div>
        </div>
      </section>

      {/* PREDICTIVE ALERTS BANNER FOR ASSET */}
      {eqPredictiveAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-xs uppercase tracking-wider text-amber-900 font-mono">
                Predictive Equipment Alert Detected
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              {eqPredictiveAlerts[0].risk} RISK
            </span>
          </div>
          <p className="text-xs font-bold">{eqPredictiveAlerts[0].summary}</p>
          <p className="text-xs text-amber-900">
            <strong>Suggested Attention:</strong> {eqPredictiveAlerts[0].suggestedAttention}
          </p>
        </div>
      )}

      {/* 2. CHECKLIST SECTION (Pressure Gauge, Physical Damage, Safety Seal, Expiry Date) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
              Field Integrity Checklist
            </h2>
            <p className="text-xs text-slate-500">
              Complete each required inspection point. Tap PASS or FAIL.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            4 Mandatory Points
          </span>
        </div>

        <div className="space-y-3">
          {MANDATORY_ITEMS.map((item, idx) => {
            const currentItemState = checklistMap[item.title] || {
              status: 'NOT_CHECKED',
              reason: item.defaultReasons[0],
              notes: '',
              severity: 'HIGH'
            };
            const isPass = currentItemState.status === 'PASS';
            const isFail = currentItemState.status === 'FAIL';

            return (
              <div 
                key={item.key}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                  isFail 
                    ? 'border-rose-300 ring-2 ring-rose-100' 
                    : isPass 
                    ? 'border-emerald-300' 
                    : 'border-slate-200'
                }`}
              >
                {/* Item Header & Pass/Fail Action Bar */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                        isFail 
                          ? 'bg-rose-100 text-rose-800' 
                          : isPass 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        0{idx + 1}
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-xl">
                          {item.requirement}
                        </p>
                      </div>
                    </div>

                    {/* Touch-Friendly PASS / FAIL Buttons (Min 48px height) */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center shrink-0 pt-2 sm:pt-0">
                      {/* PASS BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(item.title, 'PASS')}
                        className={`min-h-[48px] px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
                          isPass
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isPass ? 'text-white' : 'text-emerald-600'}`} />
                        <span>PASS</span>
                      </button>

                      {/* FAIL BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleSetStatus(item.title, 'FAIL')}
                        className={`min-h-[48px] px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
                          isFail
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                            : 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200'
                        }`}
                      >
                        <XCircle className={`w-4 h-4 ${isFail ? 'text-white' : 'text-rose-600'}`} />
                        <span>FAIL</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* CONDITIONAL FAIL SUB-CARD: If FAIL is selected, show Reason, Notes, Evidence, Severity */}
                {isFail && (
                  <div className="bg-rose-50/70 border-t border-rose-200 p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-rose-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span className="text-xs font-bold uppercase tracking-wider font-display">
                        Failure Investigation & Evidence Capture: {item.title}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reason */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 block">
                          Reason for Failure <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={currentItemState.reason}
                          onChange={(e) => handleUpdateFailField(item.title, 'reason', e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-rose-200 text-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                        >
                          {item.defaultReasons.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                          <option value="Other Specified Defect">Other Specified Defect</option>
                        </select>
                      </div>

                      {/* Severity */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 block">
                          Severity Level <span className="text-rose-600">*</span>
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleUpdateFailField(item.title, 'severity', lvl)}
                              className={`py-2 px-1 rounded-lg text-[11px] font-bold font-mono transition-all text-center ${
                                currentItemState.severity === lvl
                                  ? lvl === 'CRITICAL'
                                    ? 'bg-rose-700 text-white shadow-xs'
                                    : lvl === 'HIGH'
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : lvl === 'MEDIUM'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Notes for this item */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800 block">
                        Defect Notes & Observations
                      </label>
                      <textarea
                        rows={2}
                        value={currentItemState.notes}
                        onChange={(e) => handleUpdateFailField(item.title, 'notes', e.target.value)}
                        placeholder={`Describe specific defects or physical deviations seen on ${item.title}...`}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-rose-200 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                      />
                    </div>

                    {/* Evidence for this item */}
                    <div className="space-y-2 pt-1 border-t border-rose-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Item Evidence (Photo Attachment)
                        </label>
                        <span className="text-[11px] text-slate-500">Attach photo for this failure</span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={currentItemState.evidenceDescription || ''}
                          onChange={(e) => handleUpdateFailField(item.title, 'evidenceDescription', e.target.value)}
                          placeholder="Evidence caption (e.g. Broken needle at 120 PSI)"
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // Quick attach sample photo for this failure item
                            handleUpdateFailField(
                              item.title, 
                              'evidencePhotoUrl', 
                              'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
                            );
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Attach Sample Photo</span>
                        </button>
                      </div>

                      {currentItemState.evidencePhotoUrl && (
                        <div className="relative mt-2 w-32 h-24 rounded-lg overflow-hidden border border-rose-300">
                          <img 
                            src={currentItemState.evidencePhotoUrl} 
                            alt={item.title}
                            className="w-full h-full object-cover" 
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateFailField(item.title, 'evidencePhotoUrl', '')}
                            className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. NOTES SECTION (Large touch-friendly notes field) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 font-display">
              Technician Field Notes
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {generalNotes.length} characters
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Enter operational observations, environmental factors (ambient temperature, humidity), or corrective work notes.
        </p>

        {/* Large touch-friendly notes field */}
        <textarea
          rows={5}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Tap here to enter detailed inspection notes, calibration readings, maintenance recommendations, or handover remarks..."
          className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-base leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white shadow-inner resize-y min-h-[140px]"
        />
      </section>

      {/* 4. PHOTO/EVIDENCE SECTION */}
      <ResumableUploader
        inspectionId={activeInspection?.id || inspectionId}
        onPhotoAttached={(photo) => setPhotos(prev => [...prev, photo])}
        existingPhotos={photos}
        onPhotoRemoved={(id) => handleRemovePhoto(id)}
      />

      {/* 5. GPS SECTION */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 font-display">
              Geographic Location (GPS Telemetry)
            </h2>
          </div>

          <button
            type="button"
            onClick={acquireLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isLocating ? 'Acquiring...' : 'Refresh GPS'}</span>
          </button>
        </div>

        {/* GPS Status Indicator: Location available vs Location unavailable */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          gps.available 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
              gps.available ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`} />
            <div>
              <p className="text-xs sm:text-sm font-bold font-mono">
                {gps.available ? 'Location available' : 'Location unavailable'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {gps.statusText || (gps.available ? 'GPS coordinates locked' : 'Waiting for telemetry signal')}
              </p>
            </div>
          </div>

          {/* Coordinates display if available */}
          {gps.available && gps.latitude && gps.longitude && (
            <div className="text-left sm:text-right font-mono text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-emerald-200">
              <span className="font-bold text-slate-900">
                {gps.latitude.toFixed(6)}° N, {gps.longitude.toFixed(6)}° W
              </span>
              <span className="text-[10px] text-slate-500 block">
                Accuracy: ±{gps.accuracy || 5}m • {new Date(gps.timestamp || '').toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 6. SAVE SECTION: Large SAVE INSPECTION Button & Persistence */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Complete & Save Inspection
            </h3>
            <p className="text-xs text-slate-500">
              Inspection records are stored directly into offline browser storage (Dexie IndexedDB). Data remains in <strong className="text-slate-800">Pending Sync</strong> state until verified.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-bold text-slate-700">
              Technician: {currentUser?.name}
            </span>
          </div>
        </div>

        {/* Large SAVE INSPECTION Button */}
        <button
          type="button"
          onClick={handleSaveInspection}
          disabled={isSaving}
          className="w-full min-h-[58px] py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg tracking-wider uppercase flex items-center justify-center gap-3 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
        >
          <Save className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
          <span>{isSaving ? 'SAVING TO INDEXEDDB...' : 'SAVE INSPECTION'}</span>
        </button>

        {/* Notice of sync status */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-1 text-center font-mono">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Offline persistence enabled. Data will be marked PENDING SYNC in local Dexie storage.</span>
        </div>
      </section>

      {/* Floating Bottom Action Bar for Mobile Touch Convenience */}
      <div className="md:hidden fixed bottom-[56px] left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl z-30 flex items-center gap-3">
        <button
          onClick={handleReturn}
          className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition"
        >
          Back
        </button>
        <button
          onClick={handleSaveInspection}
          disabled={isSaving}
          className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition"
        >
          <Save className="w-4 h-4" />
          <span>SAVE INSPECTION</span>
        </button>
      </div>
    </div>
  );
};
