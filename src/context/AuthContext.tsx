import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, UserPermissions } from '../types';
import { ApiClient } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;
  sessionRemaining: string;
  isCheckingSession: boolean;
  isLoading: boolean;
  login: (email: string, passwordAttempt: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRoleQuick: (role: UserRole) => Promise<boolean>;
  switchRole: (role: UserRole) => Promise<boolean>;
  hasRole: (allowedRoles: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  usersList: User[];
  createUser: (userData: Partial<User>) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  refreshUsers: () => Promise<void>;
}

export const FOUR_REAL_USERS: { id: string; name: string; email: string; pass: string; role: UserRole; title: string; badgeNumber: string }[] = [
  {
    id: 'usr-tech-01',
    name: 'Alex Vance',
    email: 'tech1@fieldguard.io',
    pass: 'Tech1Pass123!',
    role: 'TECHNICIAN',
    title: 'Lead Field Specialist',
    badgeNumber: 'WA-TECH-01'
  },
  {
    id: 'usr-tech-02',
    name: 'David Chen',
    email: 'tech2@fieldguard.io',
    pass: 'Tech2Pass123!',
    role: 'TECHNICIAN',
    title: 'NDT Inspection Specialist',
    badgeNumber: 'WA-TECH-02'
  },
  {
    id: 'usr-sup-01',
    name: 'Marcus Reid',
    email: 'supervisor@fieldguard.io',
    pass: 'SupervisorPass123!',
    role: 'SUPERVISOR',
    title: 'Regional Field Operations Director',
    badgeNumber: 'WA-SUP-01'
  },
  {
    id: 'usr-adm-01',
    name: 'Elena Rostova',
    email: 'admin@fieldguard.io',
    pass: 'AdminPass123!',
    role: 'ADMIN',
    title: 'Chief Reliability Administrator',
    badgeNumber: 'WA-ADM-01'
  }
];

export const PRESET_CREDENTIALS: Record<UserRole, { email: string; pass: string; name: string }> = {
  TECHNICIAN: {
    email: 'tech1@fieldguard.io',
    pass: 'Tech1Pass123!',
    name: 'Alex Vance'
  },
  SUPERVISOR: {
    email: 'supervisor@fieldguard.io',
    pass: 'SupervisorPass123!',
    name: 'Marcus Reid'
  },
  ADMIN: {
    email: 'admin@fieldguard.io',
    pass: 'AdminPass123!',
    name: 'Elena Rostova'
  }
};

export const PRESET_USERS: Record<string, User> = {
  'usr-tech-01': {
    id: 'usr-tech-01',
    name: 'Alex Vance',
    email: 'tech1@fieldguard.io',
    role: 'TECHNICIAN',
    title: 'Lead Field Specialist',
    badgeNumber: 'WA-TECH-01',
    certificationLevel: 'Level III Ultrasonic & Vibration Specialist (ISO 9712)',
    lastActive: 'Just now',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
    permissions: {
      canResolveConflicts: false,
      canManageUsers: false,
      canChangeSettings: false,
      canApproveInspections: false,
      canViewAnalytics: false,
      canManageEquipment: false,
      canManageRoles: false,
      canPerformInspections: true,
      canUseAIAssistant: true,
      canViewAuditLogs: false
    }
  },
  'usr-tech-02': {
    id: 'usr-tech-02',
    name: 'David Chen',
    email: 'tech2@fieldguard.io',
    role: 'TECHNICIAN',
    title: 'NDT Inspection Specialist',
    badgeNumber: 'WA-TECH-02',
    certificationLevel: 'Level II Non-Destructive Testing Specialist (ASNT)',
    lastActive: '5 min ago',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
    permissions: {
      canResolveConflicts: false,
      canManageUsers: false,
      canChangeSettings: false,
      canApproveInspections: false,
      canViewAnalytics: false,
      canManageEquipment: false,
      canManageRoles: false,
      canPerformInspections: true,
      canUseAIAssistant: true,
      canViewAuditLogs: false
    }
  },
  'usr-sup-01': {
    id: 'usr-sup-01',
    name: 'Marcus Reid',
    email: 'supervisor@fieldguard.io',
    role: 'SUPERVISOR',
    title: 'Regional Field Operations Director',
    badgeNumber: 'WA-SUP-01',
    certificationLevel: 'Lead Auditor (ISO 55001 / OSHA 30 / NFPA 70E)',
    lastActive: '2 min ago',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    permissions: {
      canResolveConflicts: true,
      canManageUsers: false,
      canChangeSettings: false,
      canApproveInspections: true,
      canViewAnalytics: true,
      canManageEquipment: true,
      canManageRoles: false,
      canPerformInspections: true,
      canUseAIAssistant: true,
      canViewAuditLogs: true
    }
  },
  'usr-adm-01': {
    id: 'usr-adm-01',
    name: 'Elena Rostova',
    email: 'admin@fieldguard.io',
    role: 'ADMIN',
    title: 'Chief Reliability Administrator',
    badgeNumber: 'WA-ADM-01',
    certificationLevel: 'Enterprise Systems & Security Architect',
    lastActive: 'Active in HQ',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
    permissions: {
      canResolveConflicts: true,
      canManageUsers: true,
      canChangeSettings: true,
      canApproveInspections: true,
      canViewAnalytics: true,
      canManageEquipment: true,
      canManageRoles: true,
      canPerformInspections: true,
      canUseAIAssistant: true,
      canViewAuditLogs: true
    }
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => ApiClient.getStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('wa1_jwt_token'));
  const [sessionRemaining, setSessionRemaining] = useState<string>('8h 00m');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Validate session against backend on boot
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const storedToken = localStorage.getItem('wa1_jwt_token');
      if (!storedToken || ApiClient.isTokenExpired()) {
        ApiClient.clearSession();
        if (isMounted) {
          setCurrentUser(null);
          setToken(null);
          setIsCheckingSession(false);
        }
        return;
      }

      try {
        const response = await ApiClient.verifySession();
        if (isMounted && response.authenticated && response.user) {
          setCurrentUser(response.user);
          setToken(storedToken);
        }
      } catch (err) {
        console.warn('Backend session verification failed, resetting token:', err);
        ApiClient.clearSession();
        if (isMounted) {
          setCurrentUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update session remaining countdown
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      const ms = ApiClient.getTimeUntilExpiry();
      if (ms <= 0) {
        // Expired
        ApiClient.clearSession();
        setCurrentUser(null);
        setToken(null);
        setAuthError('Session expired. Please log in again.');
      } else {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        setSessionRemaining(`${hours}h ${minutes.toString().padStart(2, '0')}m`);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  /**
   * Real backend Login call
   */
  const login = async (email: string, passwordAttempt: string): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    try {
      const response = await ApiClient.login(email, passwordAttempt);
      if (response.success && response.user && response.token) {
        setCurrentUser(response.user);
        setToken(response.token);
        return { success: true };
      }
      const err = 'Authentication failed. Please verify credentials.';
      setAuthError(err);
      return { success: false, error: err };
    } catch (err: unknown) {
      const error = err as Error;
      const message = error.message || 'Invalid email or password.';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  /**
   * Real Quick Role Login with verified backend credentials
   */
  const switchRoleQuick = async (role: UserRole): Promise<boolean> => {
    const creds = PRESET_CREDENTIALS[role];
    if (!creds) return false;
    const result = await login(creds.email, creds.pass);
    return result.success;
  };

  /**
   * Logout and clear backend session
   */
  const logout = async () => {
    await ApiClient.logout();
    setCurrentUser(null);
    setToken(null);
    setAuthError(null);
  };

  /**
   * Check if current user has one of the allowed roles
   */
  const hasRole = (allowedRoles: UserRole | UserRole[]): boolean => {
    if (!currentUser) return false;
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return rolesArray.includes(currentUser.role);
  };

  /**
   * Check if current user has a specific permission flag
   */
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!currentUser || !currentUser.permissions) return false;
    return !!currentUser.permissions[permission];
  };

  const [customUsers, setCustomUsers] = useState<User[]>([]);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await ApiClient.request<{ success: boolean; users: any[] }>('/api/admin/users', { method: 'GET' });
      if (res.success && res.users) {
        const mapped: User[] = res.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          title: u.title,
          badgeNumber: u.badgeNumber,
          certificationLevel: u.certificationLevel,
          avatar: u.avatar,
          lastActive: 'Active recently',
          permissions: u.role === 'ADMIN' ? PRESET_USERS.ADMIN.permissions : u.role === 'SUPERVISOR' ? PRESET_USERS.SUPERVISOR.permissions : PRESET_USERS.TECHNICIAN.permissions
        }));
        setCustomUsers(mapped);
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshUsers();
    }
  }, [currentUser, refreshUsers]);

  const allUsersList = customUsers.length > 0 ? customUsers : Object.values(PRESET_USERS);

  const createUser = async (userData: Partial<User>): Promise<User> => {
    const role = userData.role || 'TECHNICIAN';
    const permissions = role === 'ADMIN' ? PRESET_USERS.ADMIN.permissions : role === 'SUPERVISOR' ? PRESET_USERS.SUPERVISOR.permissions : PRESET_USERS.TECHNICIAN.permissions;
    const res = await ApiClient.createUser(userData);
    const newUser: User = {
      ...(res.user || userData),
      permissions
    } as User;
    setCustomUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = async (id: string, updates: Partial<User>): Promise<User> => {
    const res = await ApiClient.updateUser(id, updates);
    const updatedUser = res.user || ({ ...updates, id } as User);
    setCustomUsers(prev => prev.map(u => u.id === id ? { ...u, ...updatedUser } : u));
    return updatedUser;
  };

  const deleteUser = async (id: string): Promise<void> => {
    await ApiClient.deleteUser(id);
    setCustomUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser && !!token,
        token,
        sessionRemaining,
        isCheckingSession,
        isLoading: isCheckingSession,
        login,
        logout,
        switchRoleQuick,
        switchRole: switchRoleQuick,
        hasRole,
        hasPermission,
        usersList: allUsersList,
        createUser,
        updateUser,
        deleteUser,
        authError,
        clearAuthError,
        refreshUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
