import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { InspectionProvider, useInspections } from './context/InspectionContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { Header } from './components/common/Header';
import { PersistentNetworkBanner } from './components/common/PersistentNetworkBanner';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginView } from './components/views/LoginView';
import { TechnicianDashboard } from './components/dashboards/TechnicianDashboard';
import { SupervisorDashboard } from './components/dashboards/SupervisorDashboard';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { InspectionsView } from './components/views/InspectionsView';
import { ConflictsView } from './components/views/ConflictsView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { AuditHistoryView } from './components/views/AuditHistoryView';
import { AIAssistantView } from './components/views/AIAssistantView';
import { SyncCenterView } from './components/views/SyncCenterView';
import { EquipmentView } from './components/views/EquipmentView';
import { UsersView } from './components/views/UsersView';
import { SettingsView } from './components/views/SettingsView';
import { ProfileView } from './components/views/ProfileView';
import { InspectionDetailModal } from './components/views/InspectionDetailModal';
import { InspectionScreen } from './components/views/InspectionScreen';
import { NewInspectionModal } from './components/views/NewInspectionModal';
import { Shield, KeyRound, ArrowRight } from 'lucide-react';
import type { Inspection } from './types';

const MainAppContent: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const { currentPath, navigate } = useRouter();
  const { selectedInspection, setSelectedInspection, inspections } = useInspections();
  
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNewInspectionModal, setShowNewInspectionModal] = useState(false);

  // Sync activeView with URL path
  useEffect(() => {
    if (currentPath.includes('/inspect')) {
      setActiveView('inspect');
    } else if (currentPath.includes('/dashboard')) {
      setActiveView('dashboard');
    } else if (currentPath.includes('/inspections')) {
      setActiveView('inspections');
    } else if (currentPath.includes('/conflicts')) {
      setActiveView('conflicts');
    } else if (currentPath.includes('/analytics')) {
      setActiveView('analytics');
    } else if (currentPath.includes('/audit')) {
      setActiveView('audit');
    } else if (currentPath.includes('/ai-assistant')) {
      setActiveView('ai-assistant');
    } else if (currentPath.includes('/sync')) {
      setActiveView('sync');
    } else if (currentPath.includes('/equipment')) {
      setActiveView('equipment');
    } else if (currentPath.includes('/users')) {
      setActiveView('users');
    } else if (currentPath.includes('/settings')) {
      setActiveView('settings');
    } else if (currentPath.includes('/profile')) {
      setActiveView('profile');
    }
  }, [currentPath]);

  // Loading state during token validation
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-mono font-black text-lg shadow-lg shadow-blue-500/20 animate-pulse">
          WA-1
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800">Verifying Field Authorization Token</p>
          <p className="text-xs text-slate-500 font-mono">Validating cryptographic JWT session with backend...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated -> Show Login View
  if (!isAuthenticated || currentPath === '/login') {
    return (
      <LoginView
        onLoginSuccess={() => {
          if (currentUser?.role === 'ADMIN') {
            navigate('/admin/dashboard');
          } else if (currentUser?.role === 'SUPERVISOR') {
            navigate('/supervisor/dashboard');
          } else {
            navigate('/technician/dashboard');
          }
        }}
      />
    );
  }

  const handleSelectInspection = (insp: Inspection) => {
    setSelectedInspection(insp);
    navigate('/technician/inspect');
  };

  const handleCreatedInspection = (newId: string) => {
    const created = inspections.find(i => i.id === newId);
    if (created) {
      setSelectedInspection(created);
      navigate('/technician/inspect');
    }
  };

  const handleViewNavigation = (viewId: string) => {
    setActiveView(viewId);
    switch (viewId) {
      case 'dashboard':
        if (currentUser?.role === 'ADMIN') navigate('/admin/dashboard');
        else if (currentUser?.role === 'SUPERVISOR') navigate('/supervisor/dashboard');
        else navigate('/technician/dashboard');
        break;
      case 'inspect':
        navigate('/technician/inspect');
        break;
      case 'inspections':
        navigate('/technician/inspections');
        break;
      case 'conflicts':
        navigate('/supervisor/conflicts');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'audit':
        navigate('/audit');
        break;
      case 'ai-assistant':
        navigate('/ai-assistant');
        break;
      case 'sync':
        navigate('/sync');
        break;
      case 'equipment':
        navigate('/equipment');
        break;
      case 'users':
        navigate('/users');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'profile':
        navigate('/profile');
        break;
      default:
        navigate('/technician/dashboard');
    }
  };

  // Route Content Resolver with strict RBAC Guards
  const renderCurrentRoute = () => {
    // 0. Technician Mobile Inspection Screen: /technician/inspect
    if (currentPath === '/technician/inspect' || activeView === 'inspect') {
      return (
        <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPERVISOR', 'ADMIN']}>
          <InspectionScreen
            inspectionId={selectedInspection?.id}
            onBack={() => {
              setSelectedInspection(null);
              navigate('/technician/dashboard');
            }}
          />
        </ProtectedRoute>
      );
    }

    // 1. Technician Dashboard: /technician/dashboard
    if (currentPath === '/technician/dashboard' || (currentPath === '/' && currentUser?.role === 'TECHNICIAN')) {
      return (
        <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPERVISOR', 'ADMIN']}>
          <TechnicianDashboard
            onSelectInspection={handleSelectInspection}
            onOpenNewModal={() => setShowNewInspectionModal(true)}
            onNavigate={handleViewNavigation}
          />
        </ProtectedRoute>
      );
    }

    // 2. Supervisor Dashboard: /supervisor/dashboard (Restricted: Supervisor or Admin only)
    if (currentPath === '/supervisor/dashboard' || (currentPath === '/' && currentUser?.role === 'SUPERVISOR')) {
      return (
        <ProtectedRoute
          allowedRoles={['SUPERVISOR', 'ADMIN']}
          requiredRoleLabel="Supervisor or Admin"
          actionAttempted="access the Supervisor Review Control Board"
        >
          <SupervisorDashboard
            onSelectInspection={handleSelectInspection}
            onNavigate={handleViewNavigation}
          />
        </ProtectedRoute>
      );
    }

    // 3. Admin Dashboard: /admin/dashboard (Restricted: Admin only)
    if (currentPath === '/admin/dashboard' || (currentPath === '/' && currentUser?.role === 'ADMIN')) {
      return (
        <ProtectedRoute
          allowedRoles={['ADMIN']}
          requiredRoleLabel="System Administrator"
          actionAttempted="access the WA-1 System Administration Console"
        >
          <AdminDashboard onNavigate={handleViewNavigation} />
        </ProtectedRoute>
      );
    }

    // 4. Technician Inspections: /technician/inspections
    if (currentPath === '/technician/inspections' || activeView === 'inspections') {
      return (
        <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPERVISOR', 'ADMIN']}>
          <InspectionsView
            onSelectInspection={handleSelectInspection}
            onOpenNewModal={() => setShowNewInspectionModal(true)}
          />
        </ProtectedRoute>
      );
    }

    // 5. Supervisor Conflicts: /supervisor/conflicts (Restricted: Supervisor & Admin only; Technicians CANNOT resolve conflicts)
    if (currentPath === '/supervisor/conflicts' || activeView === 'conflicts') {
      return (
        <ProtectedRoute
          allowedRoles={['SUPERVISOR', 'ADMIN']}
          requiredRoleLabel="Supervisor or Administrator"
          actionAttempted="review & resolve concurrent CRDT vector conflicts"
        >
          <ConflictsView />
        </ProtectedRoute>
      );
    }

    // 6. User Directory: /users (Restricted: Admin only)
    if (currentPath === '/users' || activeView === 'users') {
      return (
        <ProtectedRoute
          allowedRoles={['ADMIN']}
          requiredRoleLabel="System Administrator"
          actionAttempted="manage personnel accounts and assign cryptographic roles"
        >
          <UsersView />
        </ProtectedRoute>
      );
    }

    // 7. System Settings: /settings (Restricted: Admin only)
    if (currentPath === '/settings' || activeView === 'settings') {
      return (
        <ProtectedRoute
          allowedRoles={['ADMIN']}
          requiredRoleLabel="System Administrator"
          actionAttempted="modify system settings and inspection templates"
        >
          <SettingsView />
        </ProtectedRoute>
      );
    }

    // 8. Analytics & KPIs: /analytics (Restricted: Supervisor & Admin only)
    if (currentPath === '/analytics' || activeView === 'analytics') {
      return (
        <ProtectedRoute
          allowedRoles={['SUPERVISOR', 'ADMIN']}
          requiredRoleLabel="Supervisor or Administrator"
          actionAttempted="access organizational telemetry analytics"
        >
          <AnalyticsView />
        </ProtectedRoute>
      );
    }

    // 9. Audit History: /audit (Restricted: Supervisor & Admin only)
    if (currentPath === '/audit' || activeView === 'audit') {
      return (
        <ProtectedRoute
          allowedRoles={['SUPERVISOR', 'ADMIN']}
          requiredRoleLabel="Supervisor or Administrator"
          actionAttempted="inspect immutable cryptographic audit logs"
        >
          <AuditHistoryView />
        </ProtectedRoute>
      );
    }

    // 10. AI Field Assistant: /ai-assistant
    if (currentPath === '/ai-assistant' || activeView === 'ai-assistant') {
      return (
        <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPERVISOR', 'ADMIN']}>
          <AIAssistantView />
        </ProtectedRoute>
      );
    }

    // 11. Sync Center: /sync
    if (currentPath === '/sync' || activeView === 'sync') {
      return (
        <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPERVISOR', 'ADMIN']}>
          <SyncCenterView />
        </ProtectedRoute>
      );
    }

    // 12. Equipment Fleet: /equipment
    if (currentPath === '/equipment' || activeView === 'equipment') {
      return (
        <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPERVISOR', 'ADMIN']}>
          <EquipmentView />
        </ProtectedRoute>
      );
    }

    // 13. Operator Profile: /profile
    if (currentPath === '/profile' || activeView === 'profile') {
      return (
        <ProtectedRoute allowedRoles={['TECHNICIAN', 'SUPERVISOR', 'ADMIN']}>
          <ProfileView />
        </ProtectedRoute>
      );
    }

    // Default fallback: route to current role dashboard
    if (currentUser?.role === 'ADMIN') return <AdminDashboard onNavigate={handleViewNavigation} />;
    if (currentUser?.role === 'SUPERVISOR') return <SupervisorDashboard onSelectInspection={handleSelectInspection} onNavigate={handleViewNavigation} />;
    return <TechnicianDashboard onSelectInspection={handleSelectInspection} onOpenNewModal={() => setShowNewInspectionModal(true)} onNavigate={handleViewNavigation} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Header */}
      <Header
        activeView={activeView}
        setActiveView={handleViewNavigation}
        onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Persistent Network & Offline Primary Store Banner */}
      <PersistentNetworkBanner />

      {/* Interactive Quick Route & Role Tester Bar */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-[11px] overflow-x-auto gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-blue-600" />
            RBAC Route Guard:
          </span>
          <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-blue-700 font-bold">
            {currentPath}
          </code>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">
            Active: <strong className="text-slate-900">{currentUser?.name}</strong> ({currentUser?.role})
          </span>
        </div>

        {/* Quick Link Buttons to Test 403 vs 200 */}
        <div className="flex items-center gap-1.5 shrink-0 font-medium">
          <span className="text-slate-400">Direct Route Tests:</span>
          <button
            onClick={() => navigate('/technician/dashboard')}
            className={`px-2 py-0.5 rounded transition ${currentPath === '/technician/dashboard' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
          >
            /tech/dash
          </button>
          <button
            onClick={() => navigate('/technician/inspect')}
            className={`px-2 py-0.5 rounded transition ${currentPath === '/technician/inspect' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
          >
            /tech/inspect
          </button>
          <button
            onClick={() => navigate('/supervisor/conflicts')}
            className={`px-2 py-0.5 rounded transition ${currentPath === '/supervisor/conflicts' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
            title="Technicians will receive 403 Forbidden"
          >
            /sup/conflicts {currentUser?.role === 'TECHNICIAN' && '🔒'}
          </button>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className={`px-2 py-0.5 rounded transition ${currentPath === '/admin/dashboard' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
            title="Non-admins will receive 403 Forbidden"
          >
            /admin/dash {currentUser?.role !== 'ADMIN' && '🔒'}
          </button>
          <button
            onClick={() => navigate('/users')}
            className={`px-2 py-0.5 rounded transition ${currentPath === '/users' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200 text-slate-700'}`}
            title="Non-admins will receive 403 Forbidden"
          >
            /users {currentUser?.role !== 'ADMIN' && '🔒'}
          </button>
        </div>
      </div>

      {/* Body Layout: Desktop Sidebar + Main Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar & Mobile Drawer */}
        <Sidebar
          activeView={activeView}
          setActiveView={handleViewNavigation}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Workspace Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 pb-20 md:pb-8">
          {renderCurrentRoute()}
        </main>
      </div>

      {/* Role-Specific Mobile Bottom Navigation */}
      <BottomNav activeView={activeView} setActiveView={handleViewNavigation} />

      {/* Inspection Interactive Detail Modal (only outside full inspection workflow) */}
      {selectedInspection && currentPath !== '/technician/inspect' && activeView !== 'inspect' && (
        <InspectionDetailModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}

      {/* New Inspection Creation Modal */}
      {showNewInspectionModal && (
        <NewInspectionModal
          onClose={() => setShowNewInspectionModal(false)}
          onCreated={handleCreatedInspection}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <NetworkProvider>
          <InspectionProvider>
            <MainAppContent />
          </InspectionProvider>
        </NetworkProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
