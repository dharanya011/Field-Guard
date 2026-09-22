import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Plus, 
  ChevronRight, 
  Layers, 
  Calendar, 
  User, 
  AlertTriangle 
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { StatusBadge } from '../common/StatusBadge';
import type { Inspection, InspectionStatus } from '../../types';

interface InspectionsViewProps {
  onSelectInspection: (inspection: Inspection) => void;
  onOpenNewModal: () => void;
}

export const InspectionsView: React.FC<InspectionsViewProps> = ({
  onSelectInspection,
  onOpenNewModal
}) => {
  const { inspections } = useInspections();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = inspections.filter((i) => {
    const matchesSearch =
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.facility.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.technicianName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' ? true : i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Field Inspection Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete schedule of mechanical, electrical, and thermal integrity audits.
          </p>
        </div>

        <button
          onClick={onOpenNewModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-900/40 active:scale-95 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Inspection</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, asset, facility, or inspector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          {['ALL', 'IN_PROGRESS', 'PENDING_REVIEW', 'PASSED', 'FAILED', 'CONFLICT'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Inspections List: Responsive Desktop Table / Mobile Cards */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 space-y-2">
          <ClipboardCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-base font-medium text-white">No inspections matched your filter</p>
          <p className="text-xs text-slate-400">Try adjusting your search criteria or create a new inspection record.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Inspection / Code</th>
                  <th className="py-3 px-4">Equipment & Location</th>
                  <th className="py-3 px-4">Assigned Tech</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sync State</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((insp) => (
                  <tr
                    key={insp.id}
                    onClick={() => onSelectInspection(insp)}
                    className="hover:bg-slate-850/80 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{insp.title}</div>
                      <div className="font-mono text-[11px] text-blue-400 mt-0.5">{insp.code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200">{insp.equipmentName}</div>
                      <div className="text-[11px] text-slate-400">{insp.facility}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {insp.technicianName}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={insp.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={insp.syncState} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={insp.score >= 80 ? 'text-emerald-400' : insp.score >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                        {insp.score}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1">
                        <span>Inspect</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filtered.map((insp) => (
              <div
                key={insp.id}
                onClick={() => onSelectInspection(insp)}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3 cursor-pointer"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="font-mono text-xs text-blue-400 font-bold">{insp.code}</span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={insp.status} size="sm" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white">{insp.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{insp.equipmentName}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <span>Score: <strong className="text-white font-mono">{insp.score}%</strong></span>
                  <span className="flex items-center gap-1 text-blue-400 font-medium">
                    Open Checklist <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
