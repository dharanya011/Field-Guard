import React, { useState } from 'react';
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
  PenTool,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ListTodo,
  Smartphone,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';
import { MobileViewerModal } from './MobileViewerModal';

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
  const [showMobileModal, setShowMobileModal] = useState(false);

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
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  // Build navigation groups by role
  const getNavGroups = (): NavGroup[] => {
    if (role === 'TECHNICIAN') {
      return [
        {
          title: 'WORK',
          items: [
            { id: 'dashboard', path: '/technician/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'inspections', path: '/technician/inspections', label: 'My Inspections', icon: ClipboardCheck },
            { id: 'inspect', path: '/technician/inspect', label: 'Perform Inspection', icon: PenTool, highlight: true },
            { id: 'equipment', path: '/equipment', label: 'Equipment', icon: Layers }
          ]
        },
        {
          title: 'INSIGHTS & AI',
          items: [
            { id: 'ai-assistant', path: '/ai-assistant', label: 'AI Field Assistant', icon: Sparkles, highlight: true },
            { id: 'audit', path: '/audit', label: 'Inspection History', icon: History }
          ]
        },
        {
          title: 'SYSTEM',
          items: [
            { 
              id: 'sync', 
              path: '/sync', 
              label: 'Sync Center', 
              icon: Database,
              badge: unsyncedChangesCount > 0 ? `${unsyncedChangesCount}` : undefined,
              badgeColor: 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
            },
            { id: 'profile', path: '/profile', label: 'Profile', icon: UserCircle }
          ]
        }
      ];
    }

    if (role === 'SUPERVISOR') {
      return [
        {
          title: 'WORK',
          items: [
            { id: 'dashboard', path: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'inspections', path: '/technician/inspections', label: 'Inspection Monitoring', icon: ClipboardCheck },
            { id: 'equipment', path: '/equipment', label: 'Equipment & Tasks', icon: Layers }
          ]
        },
        {
          title: 'COLLABORATION',
          items: [
            { 
              id: 'conflicts', 
              path: '/supervisor/conflicts', 
              label: 'Conflict Resolution', 
              icon: GitFork,
              badge: activeConflictsCount > 0 ? activeConflictsCount : undefined,
              badgeColor: 'bg-rose-500 text-white animate-pulse'
            }
          ]
        },
        {
          title: 'INSIGHTS',
          items: [
            { id: 'analytics', path: '/analytics', label: 'Analytics & KPIs', icon: BarChart3 },
            { id: 'audit', path: '/audit', label: 'Audit History', icon: History },
            { id: 'ai-assistant', path: '/ai-assistant', label: 'AI Field Assistant', icon: Sparkles, highlight: true }
          ]
        },
        {
          title: 'SYSTEM',
          items: [
            { 
              id: 'sync', 
              path: '/sync', 
              label: 'Sync Center', 
              icon: Database,
              badge: unsyncedChangesCount > 0 ? `${unsyncedChangesCount}` : undefined,
              badgeColor: 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
            },
            { id: 'profile', path: '/profile', label: 'Profile', icon: UserCircle }
          ]
        }
      ];
    }

    // ADMIN
    return [
      {
        title: 'WORK',
        items: [
          { id: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'inspections', path: '/technician/inspections', label: 'All Inspections', icon: ClipboardCheck },
          { id: 'equipment', path: '/equipment', label: 'Equipment Fleet', icon: Layers }
        ]
      },
      {
        title: 'COLLABORATION',
        items: [
          { 
            id: 'conflicts', 
            path: '/supervisor/conflicts', 
            label: 'Conflict Resolution', 
            icon: GitFork,
            badge: activeConflictsCount > 0 ? activeConflictsCount : undefined,
            badgeColor: 'bg-rose-500 text-white animate-pulse'
          }
        ]
      },
      {
        title: 'INSIGHTS',
        items: [
          { id: 'analytics', path: '/analytics', label: 'Analytics & KPIs', icon: BarChart3 },
          { id: 'audit', path: '/audit', label: 'Audit History', icon: History },
          { id: 'ai-assistant', path: '/ai-assistant', label: 'AI Field Assistant', icon: Sparkles, highlight: true }
        ]
      },
      {
        title: 'SYSTEM',
        items: [
          { id: 'users', path: '/users', label: 'Users & Roles RBAC', icon: Users },
          { id: 'settings', path: '/settings', label: 'System Configuration', icon: Settings },
          { 
            id: 'sync', 
            path: '/sync', 
            label: 'Offline Sync Center', 
            icon: Database,
            badge: unsyncedChangesCount > 0 ? `${unsyncedChangesCount}` : undefined,
            badgeColor: 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
          },
          { id: 'profile', path: '/profile', label: 'Profile', icon: UserCircle }
        ]
      }
    ];
  };

  const navGroups = getNavGroups();

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
    <div className="h-full flex flex-col justify-between bg-white text-slate-700 select-none overflow-hidden">
      {/* Top User / Role Header */}
      <div className="p-3 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            {currentUser?.role}
          </span>
          <span className="text-[11px] font-mono font-medium text-slate-500">
            {currentUser?.badgeNumber}
          </span>
        </div>
      </div>

      {/* Navigation Groups - Single Clean Scrollable List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-3.5">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-2 text-[10px] font-mono font-bold text-slate-400 tracking-wider">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isCurrentActive(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : item.highlight ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'
                      }`} />
                      <span className="truncate text-xs">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold shrink-0 ${item.badgeColor || 'bg-slate-200 text-slate-800'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Health & System Stamp */}
      <div className="p-3 border-t border-slate-200 space-y-1.5 shrink-0 bg-white">
        {/* Mobile & APK Launch Button */}
        <button
          onClick={() => setShowMobileModal(true)}
          className="w-full py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center justify-between transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Mobile Viewer & APK</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
            v3.0
          </span>
        </button>

        <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Radio className={`w-3 h-3 ${isOnline ? 'text-emerald-600 animate-pulse' : 'text-rose-600'}`} />
              Dexie Storage
            </span>
            <span className={`font-bold ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-mono">
          <span>FIELD GUARD v3.0</span>
          <span className="flex items-center gap-1 text-slate-600 font-semibold">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            RBAC
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 h-full shrink-0 z-20 bg-white border-r border-slate-200 overflow-hidden">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}

      {/* Mobile Viewer & APK Modal */}
      <MobileViewerModal 
        isOpen={showMobileModal} 
        onClose={() => setShowMobileModal(false)} 
      />
    </>
  );
};
