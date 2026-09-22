import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  Wrench, 
  Brain, 
  ShieldAlert,
  RefreshCw,
  Activity,
  CheckCircle2,
  HardHat,
  Filter,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { calculateSmartPriority, generatePredictiveAlerts } from '../../services/analyticsIntelligence';
import type { SmartPriorityLevel, Equipment } from '../../types';

type EquipmentStatus = Equipment['status'];
type EquipmentCriticality = Equipment['criticality'];

export const EquipmentView: React.FC = () => {
  const { equipments, inspections, createEquipment, updateEquipment, deleteEquipment } = useInspections();
  const { isOnline, syncStatus, triggerManualSync } = useNetwork();
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<SmartPriorityLevel | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // Form Fields
  const [formTag, setFormTag] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Turbines & Power Generation');
  const [formFacility, setFormFacility] = useState('Alpha Energy Substation 4');
  const [formLocation, setFormLocation] = useState('Bay 1 - Main Floor');
  const [formStatus, setFormStatus] = useState<EquipmentStatus>('OPERATIONAL');
  const [formCriticality, setFormCriticality] = useState<EquipmentCriticality>('MEDIUM');
  const [formHealthScore, setFormHealthScore] = useState<number>(95);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const predictiveAlerts = generatePredictiveAlerts(equipments, inspections);

  // Extract unique facilities & categories
  const facilities = Array.from(new Set(equipments.map(e => e.facility))).filter(Boolean);
  const categories = Array.from(new Set(equipments.map(e => e.category))).filter(Boolean);

  // Metrics
  const totalAssets = equipments.length;
  const operationalCount = equipments.filter(e => e.status === 'OPERATIONAL').length;
  const maintenanceCount = equipments.filter(e => e.status === 'NEEDS_MAINTENANCE' || e.status === 'CRITICAL_OFFLINE').length;
  const avgHealth = Math.round(equipments.reduce((acc, curr) => acc + (curr.healthScore || 0), 0) / (totalAssets || 1));

  const filtered = equipments.filter((eq) => {
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.facility.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (facilityFilter !== 'ALL' && eq.facility !== facilityFilter) return false;
    if (categoryFilter !== 'ALL' && eq.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && eq.status !== statusFilter) return false;

    if (priorityFilter !== 'ALL') {
      const assessment = calculateSmartPriority(eq, inspections);
      if (assessment.priority !== priorityFilter) return false;
    }

    return true;
  });

  const openCreateModal = () => {
    setFormTag(`TAG-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormCategory('Turbines & Power Generation');
    setFormFacility('Alpha Energy Substation 4');
    setFormLocation('Bay 1 - Main Floor');
    setFormStatus('OPERATIONAL');
    setFormCriticality('MEDIUM');
    setFormHealthScore(95);
    setEditingEquipment(null);
    setShowRegisterModal(true);
  };

  const openEditModal = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormTag(eq.tag);
    setFormName(eq.name);
    setFormCategory(eq.category);
    setFormFacility(eq.facility);
    setFormLocation(eq.location);
    setFormStatus(eq.status);
    setFormCriticality(eq.criticality);
    setFormHealthScore(eq.healthScore || 90);
    setShowRegisterModal(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTag.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingEquipment) {
        await updateEquipment(editingEquipment.id, {
          name: formName,
          tag: formTag,
          category: formCategory,
          facility: formFacility,
          location: formLocation,
          status: formStatus,
          criticality: formCriticality,
          healthScore: Number(formHealthScore)
        });
        setNotice(`Asset ${formName} updated successfully.`);
      } else {
        await createEquipment({
          name: formName,
          tag: formTag,
          category: formCategory,
          facility: formFacility,
          location: formLocation,
          status: formStatus,
          criticality: formCriticality,
          healthScore: Number(formHealthScore)
        });
        setNotice(`Asset ${formName} registered successfully.`);
      }
      setShowRegisterModal(false);
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to decommission and remove asset "${name}"?`)) {
      try {
        await deleteEquipment(id);
        setNotice(`Asset ${name} deleted.`);
        setTimeout(() => setNotice(null), 4000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Row: Title on Left, Action Buttons on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Equipment Fleet & Asset Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Critical infrastructure tracking for industrial turbines, cryogenic safety valves, and high-pressure steam vessels.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Register Asset</span>
          </button>

          <button
            onClick={triggerManualSync}
            disabled={!isOnline || syncStatus === 'SYNCING'}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Synchronize equipment telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{notice}</span>
        </div>
      )}

      {/* 2. KPI Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Total Assets */}
        <div 
          onClick={() => { setPriorityFilter('ALL'); setStatusFilter('ALL'); }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            priorityFilter === 'ALL' && statusFilter === 'ALL' ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Total Fleet</span>
            <div className="p-1 rounded-md bg-blue-100 text-blue-700">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">{totalAssets}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Registered machines</p>
        </div>

        {/* Operational */}
        <div 
          onClick={() => setStatusFilter('OPERATIONAL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'OPERATIONAL' ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Operational</span>
            <div className="p-1 rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700 font-mono">{operationalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Normal status</p>
        </div>

        {/* Maintenance */}
        <div 
          onClick={() => setStatusFilter('NEEDS_MAINTENANCE')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'NEEDS_MAINTENANCE' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Maintenance</span>
            <div className="p-1 rounded-md bg-amber-100 text-amber-700">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-700 font-mono">{maintenanceCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Needs servicing</p>
        </div>

        {/* Fleet Average Health */}
        <div className="p-3.5 rounded-xl border bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Fleet Health</span>
            <div className="p-1 rounded-md bg-indigo-100 text-indigo-700">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-indigo-700 font-mono">{avgHealth}%</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Composite telemetry</p>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by asset name, tag, or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Facility Filter */}
          <div className="lg:col-span-3">
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              aria-label="Filter by Facility"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Facilities</option>
              {facilities.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Asset Statuses</option>
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="NEEDS_MAINTENANCE">NEEDS MAINTENANCE</option>
              <option value="CRITICAL_OFFLINE">CRITICAL OFFLINE</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="lg:col-span-2">
            {(searchTerm || facilityFilter !== 'ALL' || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || statusFilter !== 'ALL') ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFacilityFilter('ALL');
                  setCategoryFilter('ALL');
                  setPriorityFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="w-full py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <div className="text-center text-[11px] text-slate-400 py-2">
                {filtered.length} matching
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Equipment Grid / Cards */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No equipment found</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting filters or click "+ Register Asset" above to add new machinery.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((eq) => {
            const smartPriority = calculateSmartPriority(eq, inspections);
            const eqAlerts = predictiveAlerts.filter(a => a.equipmentId === eq.id);

            return (
              <div key={eq.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5 flex flex-col justify-between hover:border-slate-300 transition">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {eq.tag}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        smartPriority.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        smartPriority.priority === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        smartPriority.priority === 'MEDIUM' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {smartPriority.priority}
                      </span>
                      <StatusBadge status={eq.status} size="sm" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{eq.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{eq.facility} • {eq.location}</p>
                  </div>

                  {/* Predictive Alert Pill if exists */}
                  {eqAlerts.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2">
                      <Brain className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Predictive Alert:</span>
                        <p className="text-slate-700">{eqAlerts[0].summary}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Health Rating:</span>
                    <span className="font-mono font-bold text-slate-900">{eq.healthScore}%</span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${eq.healthScore >= 80 ? 'bg-emerald-500' : eq.healthScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${eq.healthScore}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-100">
                  <span>Next: {eq.nextScheduledDate}</span>
                  <div className="flex items-center gap-1.5 font-sans">
                    <button
                      onClick={() => openEditModal(eq)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition"
                      title="Edit Asset"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(eq.id, eq.name)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center gap-1 transition"
                        title="Decommission Asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REGISTER / EDIT ASSET MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">
                    {editingEquipment ? 'Edit Equipment Asset' : 'Register Equipment Asset'}
                  </h2>
                  <p className="text-xs text-slate-500">Asset will be saved locally & synced to backend database</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Asset Tag / Serial
                  </label>
                  <input
                    type="text"
                    required
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    placeholder="e.g. TAG-401"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Turbines & Power Generation"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Asset Title / Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Main Turbine Generator T-400"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Facility / Sector
                  </label>
                  <input
                    type="text"
                    required
                    value={formFacility}
                    onChange={(e) => setFormFacility(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bay / Sub-location
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as EquipmentStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="OPERATIONAL">OPERATIONAL</option>
                    <option value="NEEDS_MAINTENANCE">NEEDS MAINTENANCE</option>
                    <option value="CRITICAL_OFFLINE">CRITICAL OFFLINE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Criticality
                  </label>
                  <select
                    value={formCriticality}
                    onChange={(e) => setFormCriticality(e.target.value as EquipmentCriticality)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Health Score (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formHealthScore}
                    onChange={(e) => setFormHealthScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingEquipment ? 'Update Asset' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
