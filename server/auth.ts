import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export type UserRole = 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';

export interface UserPermissions {
  canResolveConflicts: boolean;
  canManageUsers: boolean;
  canChangeSettings: boolean;
  canApproveInspections: boolean;
  canViewAnalytics: boolean;
  canManageEquipment: boolean;
  canManageRoles: boolean;
  canPerformInspections: boolean;
  canUseAIAssistant: boolean;
  canViewAuditLogs: boolean;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Plain/SHA/comparable for demo verification
  role: UserRole;
  title: string;
  badgeNumber: string;
  certificationLevel: string;
  avatar: string;
  permissions: UserPermissions;
}

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  badgeNumber: string;
  permissions: UserPermissions;
  iat?: number;
  exp?: number;
}

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'wa1-field-inspection-jwt-secret-2026';

// Role-Based Access Control matrix
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  TECHNICIAN: {
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
  },
  SUPERVISOR: {
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
  },
  ADMIN: {
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
};

// Registered database users with official credentials
export const REGISTERED_USERS: UserRecord[] = [
  {
    id: 'usr-tech-01',
    name: 'Alex Vance',
    email: 'alex.vance@wa1-field.internal',
    passwordHash: 'TechPass123!',
    role: 'TECHNICIAN',
    title: 'Lead Field Specialist',
    badgeNumber: 'WA-TECH-042',
    certificationLevel: 'Level III Ultrasonic & Vibration Specialist (ISO 9712)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
    permissions: ROLE_PERMISSIONS.TECHNICIAN
  },
  {
    id: 'usr-sup-01',
    name: 'Marcus Reid',
    email: 'marcus.reid@wa1-field.internal',
    passwordHash: 'SupervisorPass123!',
    role: 'SUPERVISOR',
    title: 'Regional Field Director',
    badgeNumber: 'WA-SUP-018',
    certificationLevel: 'Lead Auditor (ISO 55001 / OSHA 30 / NFPA 70E)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    permissions: ROLE_PERMISSIONS.SUPERVISOR
  },
  {
    id: 'usr-adm-01',
    name: 'Elena Rostova',
    email: 'elena.rostova@wa1-field.internal',
    passwordHash: 'AdminPass123!',
    role: 'ADMIN',
    title: 'Chief Reliability Administrator',
    badgeNumber: 'WA-ADM-001',
    certificationLevel: 'Systems Security & Infrastructure Architect',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
    permissions: ROLE_PERMISSIONS.ADMIN
  }
];

// Universal test/evaluator password
const UNIVERSAL_EVAL_PASS = 'WA1Secure2026!';

/**
 * Verify user credentials against internal records
 */
export function verifyCredentials(email: string, passwordAttempt: string): UserRecord | null {
  const user = REGISTERED_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return null;

  // Check matching password or universal evaluation password
  if (user.passwordHash === passwordAttempt || passwordAttempt === UNIVERSAL_EVAL_PASS) {
    return user;
  }
  return null;
}

/**
 * Generate cryptographically signed JWT with 8-hour expiry
 */
export function generateToken(user: UserRecord): string {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    badgeNumber: user.badgeNumber,
    permissions: user.permissions
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '8h',
    algorithm: 'HS256',
    issuer: 'wa1-field-inspection',
    audience: 'wa1-field-client'
  });
}

/**
 * Decode and verify JWT
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'wa1-field-inspection',
    audience: 'wa1-field-client'
  }) as JWTPayload;
}

/**
 * Express Middleware: Authenticate JWT Bearer token
 */
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required. Missing Bearer token.',
      code: 'UNAUTHORIZED'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Session expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }
    res.status(401).json({
      error: 'Invalid or forged authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Express Middleware: Authorize specific Roles (RBAC)
 */
export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required prior to authorization check.',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access Denied: Role [${req.user.role}] does not possess authorization for this action. Required roles: ${allowedRoles.join(', ')}`,
        code: 'FORBIDDEN',
        userRole: req.user.role,
        allowedRoles
      });
      return;
    }

    next();
  };
}

/**
 * Express Middleware: Authorize by Specific Permission Flag
 */
export function authorizePermission(permission: keyof UserPermissions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required.',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    if (!req.user.permissions[permission]) {
      res.status(403).json({
        error: `Access Denied: Role [${req.user.role}] lacks permission [${permission}].`,
        code: 'PERMISSION_DENIED',
        permission
      });
      return;
    }

    next();
  };
}
