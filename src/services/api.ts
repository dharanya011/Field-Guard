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

  /**
   * Sync Push: Push batch of offline operations to backend database
   */
  public static async pushSync(operations: Array<{ type: string; entityId: string; entityType?: string; payload: Record<string, unknown>; timestamp: string }>, clientId?: string) {
    return this.request<{
      success: boolean;
      processedOpsCount: number;
      processedOps: string[];
      syncedItemIds: string[];
      serverTime: string;
    }>('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({ operations, clientId })
    });
  }

  /**
   * Sync Pull: Fetch remote updates since lastSyncedAt
   */
  public static async pullSync(lastSyncedAt?: string) {
    const query = lastSyncedAt ? `?lastSyncedAt=${encodeURIComponent(lastSyncedAt)}` : '';
    return this.request<{ success: boolean; inspections: unknown[]; serverTime: string }>(`/api/sync/pull${query}`, {
      method: 'GET'
    });
  }

  /**
   * Fetch all inspections from backend database
   */
  public static async getInspections(filters?: { status?: string; technicianId?: string; equipmentId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.technicianId) params.set('technicianId', filters.technicianId);
    if (filters?.equipmentId) params.set('equipmentId', filters.equipmentId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return this.request<{ success: boolean; count: number; inspections: unknown[] }>(`/api/inspections${queryString}`, {
      method: 'GET'
    });
  }

  /**
   * Fetch single inspection details from backend database
   */
  public static async getInspectionById(id: string) {
    return this.request<{ success: boolean; inspection: unknown }>(`/api/inspections/${id}`, {
      method: 'GET'
    });
  }

  /**
   * Create new inspection on backend database
   */
  public static async createInspection(payload: Record<string, unknown>) {
    return this.request<{ success: boolean; message: string; inspection: unknown }>('/api/inspections', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Update existing inspection on backend database
   */
  public static async updateInspection(id: string, payload: Record<string, unknown>) {
    return this.request<{ success: boolean; message: string; inspection: unknown }>(`/api/inspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Fetch inspection audit logs from backend database
   */
  public static async getAuditLogs(inspectionId: string = 'all') {
    return this.request<{ success: boolean; inspectionId: string; count: number; auditLogs: unknown[] }>(`/api/audit/${inspectionId}`, {
      method: 'GET'
    });
  }

  /**
   * Initialize chunked media upload on backend server
   */
  public static async initMediaUpload(params: { inspectionId?: string; fileName: string; fileType: string; fileSize: number; totalChunks: number }) {
    return this.request<{ success: boolean; uploadId: string; storagePath: string }>('/api/media/upload/init', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  /**
   * Upload single media chunk to backend server
   */
  public static async uploadMediaChunk(params: { uploadId: string; chunkIndex: number; totalChunks: number; chunkData: string }) {
    return this.request<{ success: boolean; uploadId: string; chunkIndex: number; receivedChunks: number; totalChunks: number; status: string; isComplete: boolean }>('/api/media/upload/chunk', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  /**
   * Query current chunked upload status to allow resuming from e.g. 60%
   */
  public static async getMediaUploadStatus(uploadId: string) {
    return this.request<{
      success: boolean;
      uploadId: string;
      fileName: string;
      fileSize: number;
      receivedChunks: number;
      totalChunks: number;
      progressPercentage: number;
      status: string;
      missingChunks: number[];
      s3Location: string;
    }>(`/api/media/upload/status/${uploadId}`, {
      method: 'GET'
    });
  }

  /**
   * Complete chunked media upload
   */
  public static async completeMediaUpload(uploadId: string) {
    return this.request<{
      success: boolean;
      uploadId: string;
      fileName: string;
      totalChunks: number;
      receivedChunks: number;
      s3Url: string;
      publicUrl: string;
      completedAt: string;
    }>('/api/media/upload/complete', {
      method: 'POST',
      body: JSON.stringify({ uploadId })
    });
  }

  /**
   * Fetch AI Configuration Status
   */
  public static async getAiStatus() {
    return this.request<{
      success: boolean;
      geminiConfigured: boolean;
      status: 'GEMINI AI — ONLINE' | 'GEMINI NOT CONFIGURED';
      model: string;
    }>('/api/ai/status', {
      method: 'GET'
    });
  }

  /**
   * Query Gemini / Server Field Assistant
   */
  public static async queryAi(query: string, context?: unknown) {
    return this.request<{
      success: boolean;
      status: string;
      geminiConfigured: boolean;
      text?: string;
      message?: string;
    }>('/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query, context })
    });
  }

  /**
   * Analyze Conflict Item via Gemini AI Conflict Assistant
   */
  public static async analyzeConflictWithAi(conflictItem: unknown) {
    return this.request<{
      success: boolean;
      status: string;
      geminiConfigured: boolean;
      suggestion: string;
    }>('/api/ai/conflict-analysis', {
      method: 'POST',
      body: JSON.stringify({ conflictItem })
    });
  }
}
