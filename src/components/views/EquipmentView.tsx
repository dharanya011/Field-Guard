import React, { useState } from 'react';
import { Layers, Search, Plus, ShieldCheck, AlertTriangle, ArrowUpRight, Wrench, Brain, ShieldAlert } from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { StatusBadge } from '../common/StatusBadge';
import { calculateSmartPriority, generatePredictiveAlerts } from '../../services/analyticsIntelligence';
import type { SmartPriorityLevel } from '../../types';

export const EquipmentView: React.FC = () => {
  const { equipments, inspections } = useInspections();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<SmartPriorityLevel | 'ALL'>('ALL');

  const predictiveAlerts = generatePredictiveAlerts(equipments, inspections);

  const filtered = equipments.filter((eq) => {
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.facility.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (priorityFilter !== 'ALL') {
      const assessment = calculateSmartPriority(eq, inspections);
      return assessment.priority === priorityFilter;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-200 shadow-sm">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
            CRITICAL INFRASTRUCTURE REGISTRY
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight font-display">
            Equipment Fleet & Asset Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Track industrial turbines, cryogenic safety valves, and high-pressure steam vessels with Smart Priority ratings and predictive failure alerts.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Register Asset</span>
        </button>
      </div>

      {/* Search & Smart Priority Filters */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search equipment name, tag code, or facility..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Smart Priority Filter:
          </span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'NORMAL'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPriorityFilter(level)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                priorityFilter === level
                  ? level === 'CRITICAL' ? 'bg-rose-600 text-white shadow-xs' :
                    level === 'HIGH' ? 'bg-amber-500 text-white shadow-xs' :
                    level === 'MEDIUM' ? 'bg-sky-600 text-white shadow-xs' :
                    level === 'NORMAL' ? 'bg-slate-700 text-white shadow-xs' :
                    'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((eq) => {
          const smartPriority = calculateSmartPriority(eq, inspections);
          const eqAlerts = predictiveAlerts.filter(a => a.equipmentId === eq.id);

          return (
            <div key={eq.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
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

              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-100">
                <span>Next: {eq.nextScheduledDate}</span>
                <span className="text-blue-700 font-sans font-medium flex items-center gap-1 hover:underline cursor-pointer">
                  <Wrench className="w-3.5 h-3.5" /> Maintenance Log
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

