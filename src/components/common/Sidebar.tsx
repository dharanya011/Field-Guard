import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  GitFork, 
  BarChart3, 
  History, 
  Sparkles, 
  Settings, 
  UserCircle, 
  Database, 
  Layers, 
  Users, 
  ShieldCheck, 
  Radio,
  Lock,
  PenTool
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isOpenMobile,
  onCloseMobile
}) => {
  const { currentUser } = useAuth();
  const { currentPath, navigate } = useRouter();
  const { conflicts } = useInspections();
  const { isOnline, unsyncedChangesCount } = useNetwork();

  const role = currentUser?.role || 'TECHNICIAN';
  const activeConflictsCount = conflicts.filter(c => c.status === 'ACTIVE').length;

  const getDashboardPath = () => {
    switch (role) {
      case 'ADMIN': return '/admin/dashboard';
      case 'SUPERVISOR': return '/supervisor/dashboard';
      default: return '/technician/dashboard';
    }
  };

  interface NavItem {
    id: string;
    path: string;
    label: string;
    icon: any;
    badge?: number | string;
    badgeColor?: string;
    highlight?: boolean;
    restricted?: boolean;
  }

  const navItems: NavItem[] = [
    { 
      id: 'dashboard', 
      path: getDashboardPath(), 
      label: role === 'ADMIN' ? 'Admin Dashboard' : role === 'SUPERVISOR' ? 'Supervisor Board' : 'Field Dashboard', 
      icon: LayoutDashboard 
    },
    { 
      id: 'inspections', 
      path: '/technician/inspections', 
      label: role === 'TECHNICIAN' ? 'Assigned Inspections' : 'Inspection Review', 
      icon: ClipboardCheck 
    },
    { 
      id: 'inspect', 
      path: '/technician/inspect', 
      label: 'Perform Inspection', 
      icon: PenTool,
      highlight: true
    },
    { 
      id: 'conflicts', 
      path: '/supervisor/conflicts', 
      label: 'Conflict Resolution', 
      icon: GitFork,
      badge: activeConflictsCount > 0 ? activeConflictsCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      restricted: role === 'TECHNICIAN'
    },
    // Supervisor & Admin items
    ...(role === 'SUPERVISOR' || role === 'ADMIN' ? [
      { id: 'analytics', path: '/analytics', label: 'Analytics & KPIs', icon: BarChart3 },
      { id: 'audit', path: '/audit', label: 'Audit History', icon: History }
    ] : []),
    { 
      id: 'ai-assistant', 
      path: '/ai-assistant', 
      label: 'AI Field Assistant', 
      icon: Sparkles, 
      highlight: true 
    },
    { 
      id: 'sync', 
      path: '/sync', 
      label: 'Offline Sync Center', 
      icon: Database,
      badge: unsyncedChangesCount > 0 ? `${unsyncedChangesCount}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold'
    },
    // Admin exclusive items
    ...(role === 'ADMIN' ? [
      { id: 'users', path: '/users', label: 'User & Role RBAC', icon: Users },
      { id: 'equipment', path: '/equipment', label: 'Equipment Fleet', icon: Layers },
      { id: 'settings', path: '/settings', label: 'System Settings', icon: Settings }
    ] : [
      // For Technicians and Supervisors, provide a way to test restricted routes
      { 
        id: 'settings', 
        path: '/settings', 
        label: 'System Settings', 
        icon: Settings, 
        restricted: true 
      }
    ]),
    { id: 'profile', path: '/profile', label: 'Operator Profile', icon: UserCircle }
  ];

  const handleSelect = (item: NavItem) => {
    setActiveView(item.id);
    navigate(item.path);
    if (onCloseMobile) onCloseMobile();
  };

  const isCurrentActive = (item: NavItem) => {
    if (currentPath === item.path) return true;
    if (item.id === 'dashboard' && currentPath.includes('/dashboard')) return true;
    if (item.id === 'inspections' && currentPath.includes('/inspections')) return true;
    if (item.id === 'conflicts' && currentPath.includes('/conflicts')) return true;
    return activeView === item.id;
  };

  const content = (
    <div className="h-full flex flex-col justify-between py-4 px-3 bg-white border-r border-slate-200 text-slate-700">
      {/* Top Menu Items */}
      <div className="space-y-4">
        {/* User Card in Sidebar */}
        <div className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                currentUser?.name.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">{currentUser?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isCurrentActive(item);
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : item.highlight ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-800'
                  }`} />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.restricted && (
                    <span title="Restricted by RBAC (Click to test 403 response)" className="text-amber-500 opacity-80 group-hover:opacity-100">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {item.badge !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold shrink-0 ${item.badgeColor || 'bg-slate-200 text-slate-800'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Health & Architecture Stamp */}
      <div className="pt-3 border-t border-slate-200 space-y-2">
        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Radio className={`w-3 h-3 ${isOnline ? 'text-emerald-600 animate-pulse' : 'text-rose-600'}`} />
              CRDT Telemetry
            </span>
            <span className={`text-[10px] font-bold ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isOnline ? 'PASS' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            Dexie IndexedDB • JWT Active
          </p>
        </div>

        <div className="flex items-center justify-between px-2 text-[10px] text-slate-500 font-medium">
          <span>WA-1 Build v2.4</span>
          <span className="flex items-center gap-1 text-slate-700 font-semibold">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            RBAC Secure
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 h-[calc(100vh-4rem)] sticky top-16 shrink-0 z-20 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
