import React, { useState } from 'react';
import { Layers, Search, Plus, ShieldCheck, AlertTriangle, ArrowUpRight, Wrench } from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { StatusBadge } from '../common/StatusBadge';

export const EquipmentView: React.FC = () => {
  const { equipments } = useInspections();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = equipments.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.facility.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Track industrial turbines, cryogenic safety valves, and high-pressure steam vessels across facilities.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Register Asset</span>
        </button>
      </div>

      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((eq) => (
          <div key={eq.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {eq.tag}
              </span>
              <StatusBadge status={eq.status} size="sm" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{eq.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{eq.facility} • {eq.location}</p>
            </div>

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

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Next: {eq.nextScheduledDate}</span>
              <span className="text-blue-700 font-sans font-medium flex items-center gap-1 hover:underline cursor-pointer">
                <Wrench className="w-3.5 h-3.5" /> Maintenance Log
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
