import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  RefreshCw, 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  FileUp, 
  BookOpen, 
  FlaskConical,
  ExternalLink,
  SlidersHorizontal,
  FolderDown
} from 'lucide-react';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';
import type { Inspection } from '../../types';

interface InspectionsViewProps {
  onSelectInspection: (inspection: Inspection) => void;
  onOpenNewModal: () => void;
}

export const InspectionsView: React.FC<InspectionsViewProps> = ({
  onSelectInspection,
  onOpenNewModal
}) => {
  const { inspections, equipments } = useInspections();
  const { isOnline, syncStatus, triggerManualSync } = useNetwork();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [facultyFilter, setFacultyFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Metrics
  const totalRecords = inspections.length;
  const documentsUploaded = inspections.filter(i => (i.evidencePhotos && i.evidencePhotos.length > 0) || i.status === 'PASSED').length;
  const pendingExamination = inspections.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'IN_PROGRESS' || i.status === 'DRAFT').length;
  const verifiedPublications = inspections.filter(i => i.status === 'PASSED').length;
  const needsCorrection = inspections.filter(i => i.status === 'FAILED' || i.status === 'CONFLICT' || i.riskLevel === 'CRITICAL').length;

  // Filter options
  const departments = Array.from(new Set(inspections.map(i => i.facility))).filter(Boolean);
  const faculties = Array.from(new Set(inspections.map(i => i.technicianName))).filter(Boolean);

  const filtered = inspections.filter((i) => {
    const matchesSearch =
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.facility.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.technicianName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === 'ALL' || i.facility === deptFilter;
    const matchesFaculty = facultyFilter === 'ALL' || i.technicianName === facultyFilter;
    const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || (typeFilter === 'JOURNAL' ? true : false);

    return matchesSearch && matchesDept && matchesFaculty && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Row: Title on Left, Action Buttons on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Research, Publications & Grants Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Research professor submissions, uploaded documents examination, and auditor details verification workflow.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          {/* Primary Action Button (Circled in Red in User Reference) */}
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition active:scale-95 cursor-pointer"
          >
            <div className="w-4 h-4 rounded-full border border-white/80 flex items-center justify-center text-[11px] leading-none font-bold">
              +
            </div>
            <span>Add Research Paper</span>
          </button>

          {/* Secondary Action Button */}
          <button
            onClick={triggerManualSync}
            disabled={!isOnline || syncStatus === 'SYNCING'}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Synchronize with CrossRef and central database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>Sync CrossRef DOI</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary 5 Cards Row (Exact Layout from Reference Image) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Publications */}
        <div 
          onClick={() => { setStatusFilter('ALL'); setDeptFilter('ALL'); }}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5 transition hover:shadow-xs cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Total Publications</span>
            <span className="text-base font-bold text-indigo-600">{totalRecords} Records</span>
          </div>
        </div>

        {/* Documents Uploaded */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5 transition hover:shadow-xs cursor-pointer">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Documents Uploaded</span>
            <span className="text-base font-bold text-sky-600">{documentsUploaded} Uploaded</span>
          </div>
        </div>

        {/* Pending Examination */}
        <div 
          onClick={() => setStatusFilter('PENDING_REVIEW')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5 transition hover:shadow-xs cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Pending Examination</span>
            <span className="text-base font-bold text-amber-600">{pendingExamination} Papers</span>
          </div>
        </div>

        {/* Verified Publications */}
        <div 
          onClick={() => setStatusFilter('PASSED')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5 transition hover:shadow-xs cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Verified Publications</span>
            <span className="text-base font-bold text-emerald-600">{verifiedPublications} Verified</span>
          </div>
        </div>

        {/* Needs Correction */}
        <div 
          onClick={() => setStatusFilter('FAILED')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5 transition hover:shadow-xs cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Needs Correction</span>
            <span className="text-base font-bold text-rose-600">{needsCorrection} Papers</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Multi-Dropdown Filter Bar (Single Rounded Card Container) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-3">
          {/* Keyword Search Input */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, faculty, dept, DOI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Organization Dropdown */}
          <div className="w-full lg:w-36">
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Organization</label>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All</option>
              <option value="KSRCE">KSRCE</option>
              <option value="EXTERNAL">External</option>
            </select>
          </div>

          {/* Department Dropdown */}
          <div className="w-full lg:w-36">
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Research Faculty Dropdown */}
          <div className="w-full lg:w-36">
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Research Faculty</label>
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All</option>
              {faculties.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Publication Type Dropdown */}
          <div className="w-full lg:w-36">
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Publication Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All</option>
              <option value="JOURNAL">Journal</option>
              <option value="CONFERENCE">Conference</option>
              <option value="PATENT">Patent</option>
              <option value="BOOK_CHAPTER">Book Chapter</option>
            </select>
          </div>

          {/* Audit Status Dropdown */}
          <div className="w-full lg:w-36">
            <label className="text-[11px] font-medium text-slate-500 block mb-1">Audit Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All</option>
              <option value="DRAFT">Pending Head Approval</option>
              <option value="IN_PROGRESS">In Review</option>
              <option value="PENDING_REVIEW">Pending Examination</option>
              <option value="PASSED">Verified</option>
              <option value="FAILED">Needs Correction</option>
            </select>
          </div>

          {/* Search Button */}
          <div className="shrink-0">
            <button
              onClick={() => {}}
              className="w-full lg:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-2xs cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* 4. Data Table Layout */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 space-y-2 shadow-2xs">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-base font-semibold text-slate-900 font-display">No research papers match your filters</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting filters or register a new research submission.
          </p>
          <button
            onClick={onOpenNewModal}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Research Paper</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-mono">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Faculty / Dept</th>
                  <th className="py-3.5 px-4 font-semibold">Publication Title & Authors</th>
                  <th className="py-3.5 px-4 font-semibold">Type</th>
                  <th className="py-3.5 px-4 font-semibold">DOI Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Journal / Indexing</th>
                  <th className="py-3.5 px-4 font-semibold">Document</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((insp) => (
                  <tr
                    key={insp.id}
                    className="hover:bg-blue-50/30 transition"
                  >
                    {/* Faculty / Dept */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{insp.technicianName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{insp.facility}</div>
                    </td>

                    {/* Publication Title & Authors */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 line-clamp-1">{insp.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-400">({insp.code})</span> Authors: N/A
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                        Journal
                      </span>
                    </td>

                    {/* DOI Reference */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      N/A
                    </td>

                    {/* Journal / Indexing */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium line-clamp-1">{insp.equipmentName || 'IEEE Transactions on Education'}</div>
                      <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Indexing: Scopus</div>
                    </td>

                    {/* Document Attachment */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                        <span className="text-red-500 font-bold text-[10px] px-1 py-0.2 rounded bg-red-50 border border-red-200">PDF</span>
                        <span>N/A</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Not Uploaded</div>
                    </td>

                    {/* Status Pill with dot */}
                    <td className="py-3.5 px-4">
                      {insp.status === 'PASSED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Verified
                        </span>
                      ) : insp.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Needs Correction
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Pending Head Approval
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectInspection(insp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Examine</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
