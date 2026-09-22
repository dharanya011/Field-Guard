import React from 'react';
import { Users, Plus, ShieldCheck, Mail, Award, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

export const UsersView: React.FC = () => {
  const { usersList, currentUser, switchRole } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50/40 to-white border border-indigo-200 shadow-sm">
        <div>
          <span className="text-xs font-mono font-bold text-indigo-700 uppercase tracking-wider">
            SECURITY & ACCESS CONTROL (RBAC)
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight font-display">
            Certified Personnel Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Manage field technicians, lead supervisors, and system administrators with granular RBAC permissions.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Provision User</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {usersList.map((user) => {
          const isCurrent = currentUser?.id === user.id;
          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl bg-white border transition shadow-sm space-y-4 ${
                isCurrent ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/30' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-700">
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{user.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{user.title}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                  <span>Badge: {user.badgeNumber}</span>
                  <span>•</span>
                  <span className="text-blue-700 font-bold">{user.role}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                  <span className="font-semibold text-slate-500 block mb-0.5">Certifications:</span>
                  {user.certificationLevel}
                </div>
              </div>

              <button
                onClick={() => switchRole(user.role)}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500 cursor-default border border-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {isCurrent ? 'Currently Logged In' : `Switch to ${user.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
