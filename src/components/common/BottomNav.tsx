import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Database, 
  Sparkles, 
  UserCircle, 
  GitFork, 
  BarChart3, 
  Users, 
  Layers, 
  History, 
  Settings 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { useInspections } from '../../context/InspectionContext';
import { useNetwork } from '../../context/NetworkContext';

interface BottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView }) => {
  const { currentUser } = useAuth();
  const { currentPath, navigate } = useRouter();
  const { conflicts } = useInspections();
  const { unsyncedChangesCount } = useNetwork();

  const role = currentUser?.role || 'TECHNICIAN';
  const activeConflictsCount = conflicts.filter(c => c.status === 'ACTIVE').length;

  const getDashboardPath = () => {
    switch (role) {
      case 'ADMIN': return '/admin/dashboard';
      case 'SUPERVISOR': return '/supervisor/dashboard';
      default: return '/technician/dashboard';
    }
  };

  let items: Array<{ id: string; path: string; label: string; icon: any; badge?: number | string; badgeColor?: string }> = [];

  if (role === 'TECHNICIAN') {
    items = [
      { id: 'dashboard', path: '/technician/dashboard', label: 'Home', icon: LayoutDashboard },
      { id: 'inspections', path: '/technician/inspections', label: 'Inspections', icon: ClipboardCheck },
      { 
        id: 'sync', 
        path: '/sync',
        label: 'Sync', 
        icon: Database,
        badge: unsyncedChangesCount > 0 ? unsyncedChangesCount : undefined,
        badgeColor: 'bg-amber-500 text-slate-950 font-bold'
      },
      { id: 'ai-assistant', path: '/ai-assistant', label: 'AI', icon: Sparkles },
      { id: 'profile', path: '/profile', label: 'Profile', icon: UserCircle }
    ];
  } else if (role === 'SUPERVISOR') {
    items = [
      { id: 'dashboard', path: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'inspections', path: '/technician/inspections', label: 'Review', icon: ClipboardCheck },
      { 
        id: 'conflicts', 
        path: '/supervisor/conflicts',
        label: 'Conflicts', 
        icon: GitFork,
        badge: activeConflictsCount > 0 ? activeConflictsCount : undefined,
        badgeColor: 'bg-rose-500 text-white'
      },
      { id: 'analytics', path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'profile', path: '/profile', label: 'Profile', icon: UserCircle }
    ];
  } else {
    // Admin
    items = [
      { id: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'users', path: '/users', label: 'Users', icon: Users },
      { id: 'equipment', path: '/equipment', label: 'Fleet', icon: Layers },
      { id: 'audit', path: '/audit', label: 'Audit', icon: History },
      { id: 'settings', path: '/settings', label: 'Settings', icon: Settings }
    ];
  }

  const handleSelect = (item: { id: string; path: string }) => {
    setActiveView(item.id);
    navigate(item.path);
  };

  const isCurrentActive = (item: { id: string; path: string }) => {
    if (currentPath === item.path) return true;
    return activeView === item.id;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 pb-safe px-2 py-1 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = isCurrentActive(item);
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative min-w-[56px] min-h-[48px] ${
              isActive
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-600' : ''}`} />
              {item.badge !== undefined && (
                <span className={`absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-semibold ${item.badgeColor || 'bg-blue-600 text-white'}`}>
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
