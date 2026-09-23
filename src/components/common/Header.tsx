import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Search, 
  Bell, 
  ChevronRight,
  ShieldAlert, 
  Database,
  Menu,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  User as UserIcon,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useAuth, PRESET_USERS } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useNetwork } from '../../context/NetworkContext';
import { useInspections } from '../../context/InspectionContext';
import type { UserRole } from '../../types';

interface HeaderProps {
  onToggleSidebar?: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  activeView,
  setActiveView 
}) => {
  const { currentUser, switchRoleQuick, logout } = useAuth();
  const { navigate } = useRouter();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, syncStatus, triggerManualSync, unsyncedChangesCount } = useNetwork();
  const { conflicts } = useInspections();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRoleMenu(false);
        setShowNotificationMenu(false);
        setShowLogoutConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activeConflictsCount = conflicts.filter(c => c.status === 'ACTIVE').length;

  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Operations Dashboard';
      case 'inspections': return 'Research Audit';
      case 'inspect': return 'Live Inspection Audit';
      case 'equipment': return 'Equipment & Fleet Assets';
      case 'conflicts': return 'CRDT Conflict Resolution';
      case 'analytics': return 'Analytics & Reliability KPIs';
      case 'audit': return 'Cryptographic Audit Log';
      case 'ai-assistant': return 'AI Diagnostic Assistant';
      case 'sync': return 'Offline Sync Center';
      case 'users': return 'Personnel & Role Management';
      case 'settings': return 'System Settings & Config';
      case 'profile': return 'Auditor Profile';
      default: return 'Research Audit';
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    setShowRoleMenu(false);
    const success = await switchRoleQuick(role);
    if (success) {
      if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (role === 'SUPERVISOR') {
        navigate('/supervisor/dashboard');
      } else {
        navigate('/technician/dashboard');
      }
    }
  };

  const handleExecuteLogout = async () => {
    setShowLogoutConfirm(false);
    setShowRoleMenu(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-800 bg-[#0e1628] text-white px-4 sm:px-6 flex items-center justify-between gap-4 select-none shadow-md">
      {/* Left: Mobile Menu Toggle + View Title & Subtitle */}
      <div className="flex items-center gap-3.5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight font-display">
            {getViewTitle()}
          </h2>
          <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
            Welcome back, Auditor
          </p>
        </div>
      </div>

      {/* Middle-Right: Global Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-lg mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit records, student ID, subjects..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-full bg-[#17223b] border border-slate-700/80 text-white text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-[#1c2a47] transition"
          />
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer hover:text-slate-200" />
        </div>
      </div>

      {/* Right: Network Status, Sync, Bell & User Profile Pill */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Network Toggle Button */}
        <button
          onClick={toggleSimulatedOffline}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
            isOnline
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60 hover:bg-emerald-900/60'
              : 'bg-rose-950/60 text-rose-400 border-rose-700/60 hover:bg-rose-900/60 animate-pulse'
          }`}
          title={isOnline ? 'Online mode. Click to simulate offline.' : 'Offline mode. Changes stored locally.'}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="font-mono">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </button>

        {/* Sync Status Button */}
        <button
          onClick={triggerManualSync}
          disabled={!isOnline || syncStatus === 'SYNCING'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
            syncStatus === 'SYNCING'
              ? 'bg-sky-950/60 text-sky-400 border-sky-700/60 cursor-wait'
              : unsyncedChangesCount > 0
              ? 'bg-amber-950/60 text-amber-400 border-amber-700/60 hover:bg-amber-900/60 cursor-pointer'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 cursor-pointer'
          }`}
          title="Manual Synchronization"
        >
          {syncStatus === 'SYNCING' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
          ) : unsyncedChangesCount > 0 ? (
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="font-mono text-[10px]">
            {syncStatus === 'SYNCING'
              ? 'SYNCING...'
              : unsyncedChangesCount > 0
              ? `${unsyncedChangesCount} PENDING`
              : 'SYNCED'}
          </span>
        </button>

        {/* Notifications / Alerts Bell with Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="relative p-2 rounded-full bg-[#17223b] border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="View system alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-rose-600">
              {activeConflictsCount}
            </span>
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in duration-150 text-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Audit Alerts</span>
                <span className="text-[10px] text-slate-500 font-mono">Live</span>
              </div>
              <div className="divide-y divide-slate-100 mt-2 max-h-60 overflow-y-auto">
                {activeConflictsCount > 0 ? (
                  <div 
                    onClick={() => { setActiveView('conflicts'); setShowNotificationMenu(false); }}
                    className="py-2.5 flex items-start gap-2.5 hover:bg-rose-50/50 p-2 rounded-xl cursor-pointer transition"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-rose-700">{activeConflictsCount} CRDT State Conflict</p>
                      <p className="text-[11px] text-slate-500">Divergent field modifications awaiting resolution.</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-slate-500">
                    No active conflicts or alerts.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowRoleMenu(!showRoleMenu);
            }}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-[#17223b] border border-slate-700 hover:bg-[#1f2d4d] transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs">
              {currentUser?.name
                ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                : 'SY'}
            </div>

            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight truncate max-w-[130px]">
                {currentUser?.name || 'System Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {currentUser?.role === 'ADMIN' ? 'Lead_Auditor' : currentUser?.role === 'SUPERVISOR' ? 'Senior_Auditor' : 'Field_Auditor'}
              </p>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showRoleMenu && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in duration-150 text-slate-800"
            >
              <div className="px-3 py-2.5 border-b border-slate-100 mb-1.5">
                <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser?.email}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    {currentUser?.role}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{currentUser?.badgeNumber}</span>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="space-y-1 py-1 border-b border-slate-100">
                <button
                  onClick={() => { setActiveView('profile'); setShowRoleMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-slate-500" />
                  <span>View Profile</span>
                </button>

                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR') && (
                  <button
                    onClick={() => { setActiveView('settings'); setShowRoleMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Account & System Settings</span>
                  </button>
                )}
              </div>

              <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Role (RBAC)
              </div>

              <div className="space-y-1">
                {(['TECHNICIAN', 'SUPERVISOR', 'ADMIN'] as UserRole[]).map((r) => {
                  const preset = PRESET_USERS[r];
                  const isCurrent = currentUser?.role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{preset.name}</p>
                        <p className="text-[10px] text-slate-500">{r} • {preset.title}</p>
                      </div>
                      {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 mt-2 pt-1">
                <button
                  onClick={() => { setShowRoleMenu(false); setShowLogoutConfirm(true); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900 font-display">Confirm Logout</h3>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to logout? Your active session token and in-memory security context will be securely cleared.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteLogout}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
