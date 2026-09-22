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
  AlertTriangle,
  Smartphone,
  Download
} from 'lucide-react';
import { useAuth, PRESET_USERS } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useNetwork } from '../../context/NetworkContext';
import { useInspections } from '../../context/InspectionContext';
import { PWAInstallButton } from './PWAInstallButton';
import { MobileViewerModal } from './MobileViewerModal';
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
  const [showMobileModal, setShowMobileModal] = useState(false);

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
          onClick={navigateToDashboard}
          className="flex items-center gap-2 cursor-pointer group select-none"
        >
          <div className="flex items-center gap-1.5 font-display font-black text-sm sm:text-base tracking-tight text-slate-900 leading-none">
            <span className="text-blue-700 font-mono font-black text-xs px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition">
              FG
            </span>
            <span className="group-hover:text-blue-700 transition">FIELD GUARD</span>
          </div>
          <span className="hidden sm:inline-block text-[9px] font-mono tracking-wider text-slate-500 font-bold uppercase pl-2 border-l border-slate-200">
            OFFLINE-FIRST FIELD INSPECTION
          </span>
        </div>
      </div>

      {/* Middle: Unified Compact Status Area */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-1 justify-end md:justify-center max-w-lg">
        {/* ONLINE / OFFLINE Status Button (with 1-click toggle for testing) */}
        <button
          onClick={toggleSimulatedOffline}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition shadow-2xs active:scale-95 cursor-pointer ${
            isOnline
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse'
          }`}
          title={isOnline ? 'Online mode active. Click to simulate offline mode.' : 'Offline mode active (Dexie.js IndexedDB storing data). Click to go online.'}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="font-mono text-[11px]">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          {isSimulatedOffline && (
            <span className="text-[9px] font-bold text-amber-800 bg-amber-200/80 px-1 rounded">SIM</span>
          )}
        </button>

        {/* Sync Status Button */}
        <button
          onClick={triggerManualSync}
          disabled={!isOnline || syncStatus === 'SYNCING'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition shadow-2xs ${
            syncStatus === 'SYNCING'
              ? 'bg-sky-50 text-sky-800 border-sky-300 cursor-wait'
              : unsyncedChangesCount > 0
              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 cursor-pointer'
              : !isOnline
              ? 'bg-rose-50/80 text-rose-800 border-rose-200'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
          }`}
          title={isOnline ? 'Click to trigger synchronization' : 'Offline: Changes stored locally in Dexie IndexedDB'}
        >
          {syncStatus === 'SYNCING' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
          ) : unsyncedChangesCount > 0 ? (
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
          ) : isOnline ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Database className="w-3.5 h-3.5 text-rose-600" />
          )}
          <span className="font-mono">
            {syncStatus === 'SYNCING'
              ? 'SYNCING...'
              : unsyncedChangesCount > 0
              ? `${unsyncedChangesCount} PENDING`
              : !isOnline
              ? 'LOCAL DB'
              : 'SYNCED'}
          </span>
        </button>

        {/* PWA Ready Indicator */}
        <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-mono font-bold">
          PWA OFFLINE READY
        </span>

        {/* Mobile Viewer & APK Download Button */}
        <button
          onClick={() => setShowMobileModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold transition shadow-2xs cursor-pointer active:scale-95"
          title="Open Mobile Viewer Simulator & APK Package Download Center"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Mobile & APK</span>
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

      {/* Mobile Viewer & APK Modal */}
      <MobileViewerModal 
        isOpen={showMobileModal} 
        onClose={() => setShowMobileModal(false)} 
      />
    </header>
  );
};
