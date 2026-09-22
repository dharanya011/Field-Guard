import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { StatusBadge } from '../common/StatusBadge';
import type { UserRole } from '../../types';

interface UnauthorizedViewProps {
  attemptedPath: string;
  requiredRoles?: UserRole[];
  restrictionReason?: string;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  attemptedPath,
  requiredRoles = ['SUPERVISOR', 'ADMIN'],
  restrictionReason
}) => {
  const { currentUser, logout, switchRoleQuick } = useAuth();
  const { navigate } = useRouter();

  const getDefaultDashboard = () => {
    switch (currentUser?.role) {
      case 'TECHNICIAN':
        return '/technician/dashboard';
      case 'SUPERVISOR':
        return '/supervisor/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/login';
    }
  };

  const getRoleRestrictionExplanation = () => {
    if (restrictionReason) return restrictionReason;

    if (currentUser?.role === 'TECHNICIAN') {
      return 'Under WA-1 Enterprise RBAC policy, Technicians are granted operational inspection rights, but are strictly prohibited from resolving synchronization conflicts, approving inspection sign-offs, administering personnel, or changing system settings.';
    }

    if (currentUser?.role === 'SUPERVISOR') {
      return 'Under WA-1 Enterprise RBAC policy, Field Supervisors can audit and resolve conflicts, but lack administrative clearance for personnel directory provisioning and core infrastructure settings.';
    }

    return 'Your current account does not have sufficient role permissions to access this protected area.';
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-rose-200 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header Icon & Status */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                403 FORBIDDEN
              </span>
              <span className="text-xs text-slate-500 font-mono">RBAC Policy Violation</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 font-display">
              Access Restricted
            </h1>
          </div>
        </div>

        {/* Diagnostic Breakdown */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500">Attempted Route</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">
              {attemptedPath}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500">Authenticated User</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{currentUser?.name}</span>
              <StatusBadge status={currentUser?.role || 'TECHNICIAN'} size="sm" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Required Roles</span>
            <div className="flex gap-1">
              {requiredRoles.map(role => (
                <span key={role} className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Restriction Explanation */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {getRoleRestrictionExplanation()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => navigate(getDefaultDashboard())}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Authorized Dashboard</span>
          </button>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {currentUser?.role === 'TECHNICIAN' && (
              <button
                type="button"
                onClick={() => switchRoleQuick('SUPERVISOR')}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold transition"
              >
                Switch to Supervisor
              </button>
            )}

            {currentUser?.role !== 'ADMIN' && (
              <button
                type="button"
                onClick={() => switchRoleQuick('ADMIN')}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold transition"
              >
                Switch to Admin
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="py-2 px-3 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
