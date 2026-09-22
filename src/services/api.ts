import type { User, UserRole } from '../types';

const TOKEN_KEY = 'wa1_jwt_token';
const USER_KEY = 'wa1_active_user';
const SESSION_EXPIRY_KEY = 'wa1_session_expiry';

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  expiresIn: number;
}

export interface ApiError {
  error: string;
  code?: string;
  userRole?: string;
  allowedRoles?: string[];
}

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public static setSession(token: string, user: User, expiresInSeconds: number): void {
    const expiryTimestamp = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_EXPIRY_KEY, expiryTimestamp.toString());
  }

  public static clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  }

  public static getStoredUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public static isTokenExpired(): boolean {
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() > parseInt(expiry, 10);
  }

  public static getTimeUntilExpiry(): number {
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!expiry) return 0;
    return Math.max(0, parseInt(expiry, 10) - Date.now());
  }

  /**
   * Generic authenticated HTTP fetcher
   */
  public static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Trigger session invalidation if token expired
          this.clearSession();
        }
        const error = new Error(data.error || `HTTP ${response.status}: Request failed`) as Error & ApiError;
        error.code = data.code;
        error.userRole = data.userRole;
        error.allowedRoles = data.allowedRoles;
        throw error;
      }

      return data as T;
    } catch (err: unknown) {
      // Re-throw formatted error
      throw err;
    }
  }

  /**
   * Real backend Login with credentials & JWT receipt
   */
  public static async login(email: string, passwordAttempt: string): Promise<LoginResponse> {
    const data = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: passwordAttempt })
    });

    if (data.token && data.user) {
      this.setSession(data.token, data.user, data.expiresIn || 28800);
    }

    return data;
  }

  /**
   * Verify current session against backend
   */
  public static async verifySession(): Promise<{ authenticated: boolean; user: User }> {
    return this.request<{ authenticated: boolean; user: User }>('/api/auth/me', {
      method: 'GET'
    });
  }

  /**
   * Server-side logout
   */
  public static async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      this.clearSession();
    }
  }

  /**
   * Attempt Conflict Resolution (Enforces RBAC on Backend: Supervisor/Admin only)
   */
  public static async resolveConflict(conflictId: string, resolution: string, winningValue: string, notes: string) {
    return this.request<{ success: boolean; message: string }>(`/api/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, winningValue, notes })
    });
  }

  /**
   * Sign-off / Approve Inspection (Enforces RBAC on Backend: Supervisor/Admin only)
   */
  public static async approveInspection(inspectionId: string, status: string, remarks?: string) {
    return this.request<{ success: boolean; message: string }>(`/api/inspections/${inspectionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ status, remarks })
    });
  }

  /**
   * Fetch Personnel Directory (Enforces RBAC on Backend: Admin only)
   */
  public static async getAdminUsers() {
    return this.request<{ users: User[] }>('/api/admin/users', {
      method: 'GET'
    });
  }

  /**
   * Save System Configuration (Enforces RBAC on Backend: Admin only)
   */
  public static async updateAdminSettings(settings: Record<string, unknown>) {
    return this.request<{ success: boolean; message: string }>('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
}
