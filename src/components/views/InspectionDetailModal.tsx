import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Plus, 
  FileText, 
  Layers, 
  Calendar, 
  User, 
  ShieldAlert, 
  PenTool, 
  Save,
  Radio
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { StatusBadge } from '../common/StatusBadge';
import type { Inspection, ChecklistItem, Defect, RiskLevel } from '../../types';

interface InspectionDetailModalProps {
  inspection: Inspection;
  onClose: () => void;
}

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({
  inspection,
  onClose
}) => {
  const { currentUser } = useAuth();
  const { updateChecklistItem, addDefectToInspection, changeInspectionStatus } = useInspections();
  const { isOnline } = useNetwork();

  const [activeTab, setActiveTab] = useState<'checklist' | 'defects' | 'signoff'>('checklist');
  const [showAddDefect, setShowAddDefect] = useState(false);
  const [defectTitle, setDefectTitle] = useState('');
  const [defectDesc, setDefectDesc] = useState('');
  const [defectSeverity, setDefectSeverity] = useState<RiskLevel>('HIGH');
  const [defectAction, setDefectAction] = useState('');

  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [tempValue, setTempValue] = useState('');

  const handleStatusChange = async (item: ChecklistItem, newStatus: ChecklistItem['status']) => {
    await updateChecklistItem(inspection.id, item.id, { status: newStatus });
  };

  const handleSaveNotes = async (itemId: string) => {
    await updateChecklistItem(inspection.id, itemId, {
      notes: tempNotes,
      measuredValue: tempValue
    });
    setEditingNotesId(null);
  };

  const handleCreateDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectTitle.trim()) return;

    await addDefectToInspection(inspection.id, {
      title: defectTitle,
      description: defectDesc,
      severity: defectSeverity,
      recommendedAction: defectAction
    });

    setDefectTitle('');
    setDefectDesc('');
    setDefectAction('');
    setShowAddDefect(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {inspection.code}
              </span>
              <StatusBadge status={inspection.status} size="sm" />
              <StatusBadge status={inspection.syncState} size="sm" />
              {inspection.offlineDraft && (
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-50 text-amber-800 border border-amber-200">
                  DEXIE OFFLINE
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-display">
              {inspection.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {inspection.equipmentName}
              </span>
              <span>•</span>
              <span>{inspection.facility} ({inspection.zone})</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {inspection.technicianName}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === 'checklist'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Inspection Checklist ({inspection.checklist.length})
          </button>

          <button
            onClick={() => setActiveTab('defects')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'defects'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Defects & Anomalies</span>
            {inspection.defects.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                {inspection.defects.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('signoff')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 ${
              activeTab === 'signoff'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign-Off & Compliance
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-medium text-slate-500">
                  Click status buttons to update live measurement state in IndexedDB.
                </span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  Compliance Score: {inspection.score}%
                </span>
              </div>

              <div className="space-y-3">
                {inspection.checklist.map((item, idx) => {
                  const isEditing = editingNotesId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-mono font-semibold text-blue-700 uppercase tracking-wider">
                            Item {idx + 1} • {item.category}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                          <p className="text-xs text-slate-600">{item.requirement}</p>
                          {item.toleranceRange && (
                            <p className="text-[11px] font-mono text-slate-500">
                              Tolerance: <span className="text-slate-800 font-semibold">{item.toleranceRange}</span>
                            </p>
                          )}
                        </div>

                        {/* Interactive Status Selector strictly with the 4 color statuses: 🟢 PASS, 🟠 WARNING, 🔴 FAIL, 🔵 / Neutral NOT_CHECKED */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item, 'PASS')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              item.status === 'PASS'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PASS</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(item, 'WARNING')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              item.status === 'WARNING'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>WARN</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(item, 'FAIL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              item.status === 'FAIL'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>FAIL</span>
                          </button>
                        </div>
                      </div>

                      {/* Measured Value & Notes Section */}
                      <div className="pt-2 border-t border-slate-200 text-xs">
                        {isEditing ? (
                          <div className="space-y-2 mt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Measured Value (e.g. 342 PSI, 0.12mm)"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="Technician Observations & Notes"
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingNotesId(null)}
                                className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveNotes(item.id)}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save Observation</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-600">
                            <div>
                              {item.measuredValue && (
                                <span className="text-slate-700 mr-3">
                                  Measured: <strong className="text-slate-900 font-mono">{item.measuredValue}</strong>
                                </span>
                              )}
                              {item.notes && <span>Obs: {item.notes}</span>}
                              {!item.measuredValue && !item.notes && (
                                <span className="italic text-slate-400">No measured telemetry recorded</span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setEditingNotesId(item.id);
                                setTempValue(item.measuredValue || '');
                                setTempNotes(item.notes || '');
                              }}
                              className="text-blue-600 hover:text-blue-800 underline font-medium text-[11px]"
                            >
                              Edit Reading
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'defects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reported Equipment Defects</h3>
                  <p className="text-xs text-slate-500">Anomalies requiring corrective work orders.</p>
                </div>
                <button
                  onClick={() => setShowAddDefect(!showAddDefect)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Defect</span>
                </button>
              </div>

              {showAddDefect && (
                <form onSubmit={handleCreateDefect} className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-3">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                    Log New Defect / Deviation
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-700 font-semibold block mb-1">Defect Title</label>
                      <input
                        type="text"
                        value={defectTitle}
                        onChange={(e) => setDefectTitle(e.target.value)}
                        placeholder="e.g. Flange Seal Micro-Fracture"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-700 font-semibold block mb-1">Severity / Risk Level</label>
                      <select
                        value={defectSeverity}
                        onChange={(e) => setDefectSeverity(e.target.value as RiskLevel)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-rose-500"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-700 font-semibold block mb-1">Detailed Description</label>
                    <textarea
                      rows={2}
                      value={defectDesc}
                      onChange={(e) => setDefectDesc(e.target.value)}
                      placeholder="Describe symptoms, sensor telemetry or visual degradation observed..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-700 font-semibold block mb-1">Recommended Action</label>
                    <input
                      type="text"
                      value={defectAction}
                      onChange={(e) => setDefectAction(e.target.value)}
                      placeholder="e.g. Schedule immediate overhaul before cycle startup"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddDefect(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-600 text-xs hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
                    >
                      Record Defect
                    </button>
                  </div>
                </form>
              )}

              {inspection.defects.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900">No defects detected</p>
                  <p className="text-xs text-slate-500 mt-0.5">Asset currently meets operational safety limits.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inspection.defects.map((def) => (
                    <div
                      key={def.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">{def.title}</h4>
                        <StatusBadge status={def.severity} size="sm" />
                      </div>
                      <p className="text-xs text-slate-600">{def.description}</p>
                      {def.recommendedAction && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                          <strong className="text-blue-700">Action: </strong>
                          {def.recommendedAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'signoff' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-blue-600" />
                  Digital Verification Signatures (RBAC)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Technician Signature */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Field Technician Sign-off</span>
                    {inspection.signatures.technician ? (
                      <div>
                        <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {inspection.signatures.technician.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(inspection.signatures.technician.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-amber-700 italic">Signature Pending</p>
                        {currentUser?.role === 'TECHNICIAN' && (
                          <button
                            onClick={() => changeInspectionStatus(inspection.id, 'PENDING_REVIEW')}
                            className="mt-2 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                          >
                            Sign & Submit for Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Supervisor Signature */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Supervisor Approval</span>
                    {inspection.signatures.supervisor ? (
                      <div>
                        <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {inspection.signatures.supervisor.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(inspection.signatures.supervisor.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-amber-700 italic">Awaiting Supervisor Verification</p>
                        {currentUser?.role === 'SUPERVISOR' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => changeInspectionStatus(inspection.id, 'PASSED')}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                            >
                              Approve & Sign
                            </button>
                            <button
                              onClick={() => changeInspectionStatus(inspection.id, 'FAILED')}
                              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Transitions */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900">Set Lifecycle Status:</span>
                  <p className="text-[11px] text-slate-500">Current status is {inspection.status}.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => changeInspectionStatus(inspection.id, 'IN_PROGRESS')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => changeInspectionStatus(inspection.id, 'PENDING_REVIEW')}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition"
                  >
                    Submit for Review
                  </button>
                  {/* Formal Pass/Fail Approval: Supervisor / Admin only */}
                  {(currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ADMIN') ? (
                    <>
                      <button
                        onClick={async () => {
                          try {
                            await changeInspectionStatus(inspection.id, 'PASSED');
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                      >
                        Approve (Passed)
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await changeInspectionStatus(inspection.id, 'FAILED');
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition"
                      >
                        Reject (Failed)
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-lg border border-slate-200">
                      <span>Pass/Fail Approval requires Supervisor</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`} />
            <span>Persistence: Dexie.js IndexedDB v1.0</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
