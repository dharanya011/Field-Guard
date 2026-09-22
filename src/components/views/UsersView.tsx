import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  Mail, 
  Award, 
  CheckCircle2, 
  Search, 
  RefreshCw, 
  Wrench, 
  UserCheck, 
  ShieldAlert, 
  KeyRound,
  ChevronRight,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { StatusBadge } from '../common/StatusBadge';
import type { User, UserRole } from '../../types';

export const UsersView: React.FC = () => {
  const { usersList, currentUser, switchRole, createUser, updateUser, deleteUser, refreshUsers } = useAuth();
  const { isOnline, syncStatus, triggerManualSync } = useNetwork();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('TECHNICIAN');
  const [formTitle, setFormTitle] = useState('Certified Field Specialist');
  const [formBadge, setFormBadge] = useState('');
  const [formCert, setFormCert] = useState('Level II - Field Operations');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Metrics
  const totalCount = usersList.length;
  const techCount = usersList.filter(u => u.role === 'TECHNICIAN').length;
  const supCount = usersList.filter(u => u.role === 'SUPERVISOR').length;
  const adminCount = usersList.filter(u => u.role === 'ADMIN').length;

  const filtered = usersList.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const openAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormRole('TECHNICIAN');
    setFormTitle('Certified Field Specialist');
    setFormBadge(`BG-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCert('Level II - Field Operations (ISO 9712)');
    setEditingUser(null);
    setShowAddModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormTitle(u.title);
    setFormBadge(u.badgeNumber);
    setFormCert(u.certificationLevel);
    setShowAddModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: formName,
          email: formEmail,
          role: formRole,
          title: formTitle,
          badgeNumber: formBadge,
          certificationLevel: formCert
        });
        setNotice(`Personnel ${formName} updated.`);
      } else {
        await createUser({
          name: formName,
          email: formEmail,
          role: formRole,
          title: formTitle,
          badgeNumber: formBadge,
          certificationLevel: formCert
        });
        setNotice(`New personnel account ${formName} created.`);
      }
      setShowAddModal(false);
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate and remove personnel "${name}"?`)) {
      try {
        await deleteUser(id);
        setNotice(`Personnel ${name} removed.`);
        setTimeout(() => setNotice(null), 4000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans select-none">
      {/* 1. Header Row: Title & Subtitle on left, Action Buttons on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Personnel Directory & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Certified field technicians, operations supervisors, and system administrators with role-based security clearance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Personnel</span>
            </button>
          )}

          <button
            onClick={() => { refreshUsers(); triggerManualSync(); }}
            disabled={!isOnline || syncStatus === 'SYNCING'}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Synchronize user directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            <span>Sync Directory</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Users */}
        <div 
          onClick={() => setRoleFilter('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            roleFilter === 'ALL' ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Total Personnel</span>
            <div className="p-1 rounded-md bg-blue-100 text-blue-700">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 font-mono">{totalCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active directory</p>
        </div>

        {/* Technicians */}
        <div 
          onClick={() => setRoleFilter('TECHNICIAN')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            roleFilter === 'TECHNICIAN' ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Technicians</span>
            <div className="p-1 rounded-md bg-emerald-100 text-emerald-700">
              <Wrench className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700 font-mono">{techCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Field operations</p>
        </div>

        {/* Supervisors */}
        <div 
          onClick={() => setRoleFilter('SUPERVISOR')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            roleFilter === 'SUPERVISOR' ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Supervisors</span>
            <div className="p-1 rounded-md bg-indigo-100 text-indigo-700">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-indigo-700 font-mono">{supCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Sign-off authority</p>
        </div>

        {/* Admins */}
        <div 
          onClick={() => setRoleFilter('ADMIN')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            roleFilter === 'ADMIN' ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-700">Administrators</span>
            <div className="p-1 rounded-md bg-purple-100 text-purple-700">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-purple-700 font-mono">{adminCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Full governance</p>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Search Input */}
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by personnel name, badge code, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Role Dropdown */}
          <div className="lg:col-span-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by Role"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="TECHNICIAN">Field Technicians</option>
              <option value="SUPERVISOR">Operations Supervisors</option>
              <option value="ADMIN">System Administrators</option>
            </select>
          </div>

          {/* Search & Reset Buttons */}
          <div className="lg:col-span-2 flex items-center gap-2">
            {(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL') ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="w-full py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <div className="text-center text-[11px] text-slate-400 py-2 w-full">
                {filtered.length} personnel
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Personnel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((user) => {
          const isCurrent = currentUser?.id === user.id;
          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl bg-white border transition shadow-2xs space-y-3.5 flex flex-col justify-between ${
                isCurrent ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center font-bold text-slate-700">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{user.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{user.title}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px]">Badge Number:</span>
                    <span className="font-mono font-bold text-slate-800">{user.badgeNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px]">Email Address:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[160px]">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px]">Assigned Role:</span>
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'SUPERVISOR' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Certification:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] truncate max-w-[170px]">{user.certificationLevel}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => switchRole(user.role)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer border border-blue-200"
                  >
                    <span>Switch</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {currentUser?.role === 'ADMIN' && (
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition cursor-pointer"
                      title="Edit User"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {currentUser?.role === 'ADMIN' && !isCurrent && (
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs transition cursor-pointer"
                    title="Remove User"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight font-display">
                    {editingUser ? 'Edit Personnel Profile' : 'Add Personnel Profile'}
                  </h2>
                  <p className="text-xs text-slate-500">Configures role-based access control and clearance</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="jordan.miller@wa1-field.internal"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Badge Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="WA-TECH-099"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Role Clearance
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white cursor-pointer"
                  >
                    <option value="TECHNICIAN">TECHNICIAN (Field Ops)</option>
                    <option value="SUPERVISOR">SUPERVISOR (Sign-Off)</option>
                    <option value="ADMIN">ADMIN (Full Control)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Field Vibration Specialist"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Certification Credentials
                </label>
                <input
                  type="text"
                  required
                  value={formCert}
                  onChange={(e) => setFormCert(e.target.value)}
                  placeholder="e.g. Level II - Vibration Specialist (ISO 10816)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update Personnel' : 'Create Personnel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
