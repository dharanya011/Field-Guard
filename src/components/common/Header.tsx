import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Search, 
  Bell, 
  ChevronDown, 
  ShieldAlert, 
  Database,
  Menu,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth, PRESET_USERS } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useNetwork } from '../../context/NetworkContext';
import { useInspections } from '../../context/InspectionContext';
import { PWAInstallButton } from './PWAInstallButton';
import type { UserRole } from '../../types';

interface HeaderProps {
  onToggleSidebar?: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  setActiveView 
}) => {
  const { currentUser, switchRoleQuick, logout, token } = useAuth();
  const { navigate } = useRouter();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline, syncStatus, triggerManualSync, unsyncedChangesCount } = useNetwork();
  const { conflicts } = useInspections();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const activeConflictsCount = conflicts.filter(c => c.status === 'ACTIVE').length;

  const navigateToDashboard = () => {
    if (currentUser?.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (currentUser?.role === 'SUPERVISOR') {
      navigate('/supervisor/dashboard');
    } else {
      navigate('/technician/dashboard');
    }
  };

  const handleRoleChange = async (role: UserRole) => {
    setShowRoleMenu(false);
    await switchRoleQuick(role);
    if (role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (role === 'SUPERVISOR') {
      navigate('/supervisor/dashboard');
    } else {
      navigate('/technician/dashboard');
    }
  };

  const handleLogout = async () => {
    setShowRoleMenu(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none shadow-2xs">
      {/* Left: Mobile Menu Toggle & Brand */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div 
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 border border-blue-400/30 group-hover:scale-105 transition-transform">
            <span className="font-mono font-black text-sm tracking-wider text-white">WA-1</span>
          </div>
          <div className="hidden min-[480px]:block">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm tracking-tight font-display">FIELD INSPECT</span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">CRDT Offline Engine</p>
          </div>
        </div>
      </div>

      {/* Middle: Search & Network Status */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end md:justify-center max-w-md">
        {/* Offline / Online Network Pill (with 1-click toggle for testing) */}
        <button
          onClick={toggleSimulatedOffline}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition shadow-2xs active:scale-95 ${
            isOnline
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse'
          }`}
          title={isOnline ? 'Network Online. Click to simulate Offline mode.' : 'Currently Offline (IndexedDB Dexie active). Click to reconnect.'}
        >
          {isOnline ? (
            <>
              <span className="text-xs">🟢</span>
              <span className="font-mono">ONLINE</span>
            </>
          ) : (
            <>
              <span className="text-xs">🔴</span>
              <span className="font-mono">OFFLINE</span>
            </>
          )}
          {isSimulatedOffline && (
            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">SIM</span>
          )}
        </button>

        {/* Sync Status Button - Strictly only shows "Synced" if actual synchronization happened */}
        <button
          onClick={triggerManualSync}
          disabled={!isOnline || syncStatus === 'SYNCING'}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
            syncStatus === 'SYNCING'
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : unsyncedChangesCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/70'
              : !isOnline
              ? 'bg-rose-50 text-rose-700 border-rose-200 cursor-not-allowed'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
          title={isOnline ? 'Trigger synchronization with field cloud' : 'Offline: Changes stored locally in Dexie IndexedDB'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'SYNCING' ? 'animate-spin text-sky-600' : ''}`} />
          <span className="hidden md:inline font-semibold">
            {syncStatus === 'SYNCING'
              ? 'Syncing...'
              : unsyncedChangesCount > 0
              ? `${unsyncedChangesCount} Pending Sync`
              : !isOnline
              ? 'Offline (Saved)'
              : 'Synced'}
          </span>
        </button>

        {/* PWA Install Button */}
        <PWAInstallButton />
      </div>

      {/* Right: Notifications & User Role Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications / Conflicts Alert */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="View system alerts"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {activeConflictsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
            {activeConflictsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Field Notifications</span>
                <span className="text-[10px] text-slate-500 font-mono">Live</span>
              </div>
              <div className="divide-y divide-slate-100 mt-2 max-h-60 overflow-y-auto">
                {activeConflictsCount > 0 && (
                  <div 
                    onClick={() => { setActiveView('conflicts'); setShowNotificationMenu(false); }}
                    className="py-2.5 flex items-start gap-2.5 hover:bg-rose-50/50 p-2 rounded-xl cursor-pointer transition"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-rose-700">1 CRDT State Conflict</p>
                      <p className="text-[11px] text-slate-500">Ventilation AHU-09 has diverged draft values.</p>
                    </div>
                  </div>
                )}
                <div 
                  onClick={() => { setActiveView('sync'); setShowNotificationMenu(false); }}
                  className="py-2.5 flex items-start gap-2.5 hover:bg-slate-50 p-2 rounded-xl cursor-pointer transition"
                >
                  <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">IndexedDB Dexie Active</p>
                    <p className="text-[11px] text-slate-500">Offline store ready for offline inspections.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Role Quick Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-blue-100 shrink-0 border border-blue-200">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-blue-700">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>

            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[110px]">
                {currentUser?.name}
              </p>
              <p className="text-[10px] font-mono text-blue-600 leading-tight font-bold">
                {currentUser?.role}
              </p>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-slate-100 mb-1.5">
                <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser?.badgeNumber}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{currentUser?.certificationLevel}</p>
              </div>

              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition ${
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
                  onClick={handleLogout}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
