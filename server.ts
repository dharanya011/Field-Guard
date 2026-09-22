import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  verifyCredentials, 
  generateToken, 
  authenticateJWT, 
  authorizeRoles, 
  authorizePermission,
  ROLE_PERMISSIONS,
  REGISTERED_USERS,
  type AuthenticatedRequest 
} from './server/auth';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logger for auditability
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[WA-1 AUTH AUDIT] ${timestamp} ${req.method} ${req.url}`);
    next();
  });

  // Health and System Diagnostics API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'WA-1 Field Inspection Platform',
      security: 'JWT + RBAC Enforced',
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // AUTHENTICATION & SESSION ENDPOINTS
  // ==========================================

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'Email and password are required credentials.',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    const user = verifyCredentials(email, password);

    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials. Please verify your email and password.',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      expiresIn: 28800, // 8 hours in seconds
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        badgeNumber: user.badgeNumber,
        certificationLevel: user.certificationLevel,
        avatar: user.avatar,
        permissions: user.permissions
      }
    });
  });

  // GET /api/auth/me - Validate session & fetch verified user profile
  app.get('/api/auth/me', authenticateJWT, (req: AuthenticatedRequest, res) => {
    res.json({
      authenticated: true,
      user: req.user
    });
  });

  // POST /api/auth/logout - Invalidate session
  app.post('/api/auth/logout', (req, res) => {
    res.json({
      success: true,
      message: 'Session cleared.'
    });
  });

  // GET /api/auth/roles - RBAC Capability Matrix
  app.get('/api/auth/roles', (req, res) => {
    res.json({
      roles: ['TECHNICIAN', 'SUPERVISOR', 'ADMIN'],
      permissions: ROLE_PERMISSIONS
    });
  });

  // ==========================================
  // SYNCHRONIZATION QUEUE & OPERATIONS PIPELINE
  // ==========================================
  const serverOperationStore = new Map<string, any>();

  // POST /api/sync/operations - Batch process operations from client queue
  app.post('/api/sync/operations', (req, res) => {
    const { operations } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      res.status(400).json({ error: 'Operations array is required and must not be empty.' });
      return;
    }

    const processedResults = operations.map((op: any) => {
      if (!op.operationId) {
        return {
          operationId: op.operationId || 'UNKNOWN',
          status: 'FAILED',
          errorMessage: 'Missing operationId in payload'
        };
      }

      // Check simulated failure flags if explicitly provided
      if (op.forceFail || op.field === 'Simulate Server Error') {
        return {
          operationId: op.operationId,
          status: 'FAILED',
          errorMessage: 'Backend ingestion node rejected payload: CRC-32 checksum mismatch',
          retryable: true
        };
      }

      if (op.forceConflict || op.field === 'Simulate Conflict') {
        return {
          operationId: op.operationId,
          status: 'CONFLICT',
          conflictDetails: `Concurrent revision detected on node: Server holds conflicting timestamp for entity ${op.entityId}`,
          serverValue: 'SERVER_OVERRIDE_VAL'
        };
      }

      const confirmedAt = new Date().toISOString();
      serverOperationStore.set(op.operationId, {
        ...op,
        status: 'SYNCED',
        syncedAt: confirmedAt,
        serverAckTimestamp: confirmedAt
      });

      return {
        operationId: op.operationId,
        status: 'SYNCED',
        syncedAt: confirmedAt,
        message: 'Successfully persisted to WA-1 Cloud Primary Node'
      };
    });

    res.json({
      success: true,
      processedCount: processedResults.length,
      syncedCount: processedResults.filter((r: any) => r.status === 'SYNCED').length,
      failedCount: processedResults.filter((r: any) => r.status === 'FAILED').length,
      conflictCount: processedResults.filter((r: any) => r.status === 'CONFLICT').length,
      operations: processedResults,
      serverTimestamp: new Date().toISOString()
    });
  });

  // GET /api/sync/queue - Server queue state and health
  app.get('/api/sync/queue', (req, res) => {
    res.json({
      serverQueueSize: serverOperationStore.size,
      operations: Array.from(serverOperationStore.values()),
      serverNode: 'WA1-CLOUD-PRIMARY-SG1',
      status: 'ONLINE',
      timestamp: new Date().toISOString()
    });
  });


  // ==========================================
  // ROLE-BASED ACCESS CONTROLLED ENDPOINTS
  // ==========================================

  // Protected: Conflict Resolution
  // SUPERVISOR or ADMIN only. Technicians will receive 403 Forbidden.
  app.post('/api/conflicts/:id/resolve', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { resolution, winningValue, notes } = req.body;

    res.json({
      success: true,
      message: `Conflict ${id} resolved successfully by ${req.user?.name} (${req.user?.role}).`,
      conflictId: id,
      resolvedBy: req.user?.id,
      timestamp: new Date().toISOString()
    });
  });

  // Protected: Inspection Formal Sign-off / Approval
  // SUPERVISOR or ADMIN only. Technicians cannot sign off.
  app.post('/api/inspections/:id/approve', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { status, remarks } = req.body;

    res.json({
      success: true,
      message: `Inspection ${id} status updated to ${status || 'VERIFIED'} by ${req.user?.name}.`,
      supervisorId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  });

  // Protected: Personnel Directory Management
  // ADMIN only. Technicians and Supervisors will receive 403 Forbidden.
  app.get('/api/admin/users', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
    res.json({
      users: REGISTERED_USERS.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title,
        badgeNumber: u.badgeNumber,
        certificationLevel: u.certificationLevel,
        permissions: u.permissions
      }))
    });
  });

  // Protected: Provision New User
  // ADMIN only.
  app.post('/api/admin/users', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
    const { name, email, role, title, badgeNumber, certificationLevel } = req.body;

    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required.' });
      return;
    }

    res.status(201).json({
      success: true,
      message: `User ${name} provisioned with role ${role}.`,
      user: {
        id: `usr-${Date.now()}`,
        name,
        email,
        role,
        title: title || 'Field Specialist',
        badgeNumber: badgeNumber || `WA-NEW-${Math.floor(Math.random() * 1000)}`,
        certificationLevel: certificationLevel || 'Standard Field Level I'
      }
    });
  });

  // Protected: System & Security Configuration
  // ADMIN only. Technicians and Supervisors will receive 403 Forbidden.
  app.post('/api/admin/settings', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      message: 'System and security configuration updated.',
      updatedBy: req.user?.id,
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // VITE DEV / PRODUCTION MIDDLEWARE
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WA-1 Enterprise Field Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
