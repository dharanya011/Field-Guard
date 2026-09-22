import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { UnauthorizedView } from '../views/UnauthorizedView';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredRoleLabel?: string;
  actionAttempted?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredRoleLabel,
  actionAttempted
}) => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const { currentPath, navigate } = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-500">Verifying Cryptographic JWT Signature...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    navigate('/login');
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <UnauthorizedView
        attemptedPath={currentPath}
        requiredRoles={allowedRoles}
        restrictionReason={actionAttempted || `Restricted to ${requiredRoleLabel || allowedRoles.join(', ')}`}
      />
    );
  }

  return <>{children}</>;
};
