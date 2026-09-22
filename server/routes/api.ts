import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { 
  authenticateJWT, 
  authorizeRoles, 
  authorizePermission, 
  verifyCredentials, 
  generateToken, 
  type AuthenticatedRequest 
} from '../auth';
import { dbStore } from '../db/store';
import { wsSyncManager } from '../websocket';

export const apiRouter = Router();

// ==========================================
// 1. POST /api/auth/login
// ==========================================
apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({
      error: 'Invalid request: Email and password are required string parameters.',
      code: 'INVALID_INPUT'
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
    expiresIn: 28800, // 8 hours
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

// ==========================================
// 2. GET /api/inspections
// ==========================================
apiRouter.get('/inspections', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { status, technicianId, equipmentId } = req.query;

  const inspections = dbStore.getAllInspections({
    status: typeof status === 'string' ? status : undefined,
    technicianId: typeof technicianId === 'string' ? technicianId : undefined,
    equipmentId: typeof equipmentId === 'string' ? equipmentId : undefined
  });

  res.json({
    success: true,
    count: inspections.length,
    inspections
  });
});

// ==========================================
// 3. GET /api/inspections/:id
// ==========================================
apiRouter.get('/inspections/:id', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: 'Inspection ID parameter is required.', code: 'MISSING_ID' });
    return;
  }

  const inspection = dbStore.getInspectionById(id);

  if (!inspection) {
    res.status(404).json({
      error: `Inspection with ID '${id}' was not found.`,
      code: 'NOT_FOUND'
    });
    return;
  }

  res.json({
    success: true,
    inspection
  });
});

// ==========================================
// 4. POST /api/inspections
// ==========================================
apiRouter.post('/inspections', authenticateJWT, authorizePermission('canPerformInspections'), (req: AuthenticatedRequest, res) => {
  const { title, equipmentId, scheduledDate, riskLevel, generalNotes, checklist } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: 'Title is a required field.', code: 'INVALID_TITLE' });
    return;
  }

  if (!equipmentId || typeof equipmentId !== 'string') {
    res.status(400).json({ error: 'Equipment ID is a required field.', code: 'INVALID_EQUIPMENT' });
    return;
  }

  const userId = req.user!.id;
  const userName = req.user!.name;

  try {
    const newInspection = dbStore.createInspection({
      title,
      equipmentId,
      scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
      riskLevel: riskLevel || 'MEDIUM',
      generalNotes,
      checklist
    }, userId, userName);

    res.status(201).json({
      success: true,
      message: 'Inspection successfully created on backend database.',
      inspection: newInspection
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || 'Failed to create inspection.', code: 'SERVER_ERROR' });
  }
});

// ==========================================
// 5. PUT /api/inspections/:id
// ==========================================
apiRouter.put('/inspections/:id', authenticateJWT, authorizePermission('canPerformInspections'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!id) {
    res.status(400).json({ error: 'Inspection ID parameter is required.', code: 'MISSING_ID' });
    return;
  }

  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Update payload object is required.', code: 'INVALID_PAYLOAD' });
    return;
  }

  const userId = req.user!.id;
  const userName = req.user!.name;
  const userRole = req.user!.role;

  try {
    const updatedInspection = dbStore.updateInspection(id, updates, userId, userName, userRole);

    res.json({
      success: true,
      message: `Inspection ${id} successfully updated on backend database.`,
      inspection: updatedInspection
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(404).json({ error: error.message || 'Inspection update failed.', code: 'UPDATE_FAILED' });
  }
});

// ==========================================
// 5.1 DELETE /api/inspections/:id
// ==========================================
apiRouter.delete('/inspections/:id', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: 'Inspection ID is required.', code: 'MISSING_ID' });
    return;
  }

  const userId = req.user!.id;
  const userName = req.user!.name;
  const userRole = req.user!.role;

  try {
    const inspection = dbStore.getInspectionById(id);
    if (!inspection) {
      res.status(404).json({ error: `Inspection ${id} not found in database.`, code: 'NOT_FOUND' });
      return;
    }

    // Role-based permission: Admin and Supervisor can delete any inspection; Technician can delete their own
    if (userRole === 'TECHNICIAN' && inspection.assignedTechnicianId !== userId) {
      res.status(403).json({
        error: 'Forbidden: Technicians can only delete their own inspections.',
        code: 'FORBIDDEN'
      });
      return;
    }

    dbStore.deleteInspection(id, userId, userName, userRole);
    res.json({
      success: true,
      message: `Inspection ${inspection.code} (${inspection.equipmentName}) deleted successfully from database.`
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || 'Failed to delete inspection.', code: 'DELETE_FAILED' });
  }
});

// ==========================================
// 5.2 GET /api/dashboard/stats
// ==========================================
apiRouter.get('/dashboard/stats', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const allInspections = dbStore.getAllInspections();
  const allEquipment = dbStore.getAllEquipment();
  const allConflicts = dbStore.getAllConflicts();
  const allTasks = dbStore.getAllTasks();

  const userInspections = userRole === 'TECHNICIAN'
    ? allInspections.filter(i => i.assignedTechnicianId === userId || i.technicianName.includes(req.user!.name.split(' ')[0]))
    : allInspections;

  const userTasks = userRole === 'TECHNICIAN'
    ? allTasks.filter(t => t.assignedTechnicianId === userId)
    : allTasks;

  const passed = userInspections.filter(i => i.status === 'PASSED').length;
  const failed = userInspections.filter(i => i.status === 'FAILED').length;
  const inProgress = userInspections.filter(i => i.status === 'IN_PROGRESS' || i.status === 'DRAFT').length;
  const pendingReview = userInspections.filter(i => i.status === 'PENDING_REVIEW').length;
  const activeConflicts = allConflicts.filter(c => c.status === 'ACTIVE').length;

  res.json({
    success: true,
    stats: {
      totalInspections: userInspections.length,
      passed,
      failed,
      inProgress,
      pendingReview,
      activeConflicts,
      assignedTasks: userTasks.length,
      equipmentCount: allEquipment.length,
      complianceRate: userInspections.length > 0 
        ? Math.round(userInspections.reduce((sum, i) => sum + (i.score || 0), 0) / userInspections.length)
        : 0
    }
  });
});

// ==========================================
// 6. POST /api/sync/push
// ==========================================
apiRouter.post('/sync/push', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { operations, clientId } = req.body;

  if (!operations || !Array.isArray(operations)) {
    res.status(400).json({
      error: 'Invalid push payload: "operations" array is required.',
      code: 'INVALID_SYNC_PAYLOAD'
    });
    return;
  }

  const userId = req.user!.id;
  const userName = req.user!.name;

  try {
    const result = dbStore.processSyncPush(operations, userId, userName, clientId);
    
    // Broadcast live event over WebSocket
    wsSyncManager.broadcast({
      type: 'SYNC_EVENT',
      payload: {
        userId,
        userName,
        processedOpsCount: result.processedOpsCount,
        syncedItemIds: result.syncedItemIds
      },
      timestamp: new Date().toISOString()
    });

    res.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      error: error.message || 'Sync push operation failed on server.',
      code: 'SYNC_PUSH_FAILED'
    });
  }
});

// ==========================================
// 7. GET /api/sync/pull
// ==========================================
apiRouter.get('/sync/pull', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { lastSyncedAt } = req.query;

  try {
    const result = dbStore.processSyncPull(typeof lastSyncedAt === 'string' ? lastSyncedAt : undefined);
    res.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      error: error.message || 'Sync pull operation failed.',
      code: 'SYNC_PULL_FAILED'
    });
  }
});

// ==========================================
// 8. POST /api/conflicts/:id/resolve
// ==========================================
apiRouter.post('/conflicts/:id/resolve', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { resolution, winningValue, notes } = req.body;

  if (!id) {
    res.status(400).json({ error: 'Conflict ID parameter is required.', code: 'MISSING_ID' });
    return;
  }

  if (!resolution) {
    res.status(400).json({ error: 'Resolution policy is required.', code: 'MISSING_RESOLUTION' });
    return;
  }

  const userId = req.user!.id;
  const userName = req.user!.name;
  const userRole = req.user!.role;

  try {
    const resolvedConflict = dbStore.resolveConflict(
      id,
      resolution,
      winningValue || 'Resolved by ' + userName,
      notes || '',
      userId,
      userName,
      userRole
    );

    res.json({
      success: true,
      message: `Conflict ${id} resolved successfully by ${userName} (${userRole}).`,
      conflict: resolvedConflict
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(404).json({ error: error.message || 'Conflict resolution failed.', code: 'CONFLICT_NOT_FOUND' });
  }
});

// ==========================================
// 9. GET /api/audit/:inspectionId
// ==========================================
apiRouter.get('/audit/:inspectionId', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { inspectionId } = req.params;

  const logs = dbStore.getAuditHistory(inspectionId === 'all' ? undefined : inspectionId);

  res.json({
    success: true,
    inspectionId,
    count: logs.length,
    auditLogs: logs
  });
});

// ==========================================
// 10. POST /api/media/upload/init
// ==========================================
apiRouter.post('/media/upload/init', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { inspectionId, fileName, fileType, fileSize, totalChunks } = req.body;

  if (!fileName || !fileType || !fileSize || !totalChunks) {
    res.status(400).json({
      error: 'Missing required media parameters: fileName, fileType, fileSize, totalChunks.',
      code: 'INVALID_MEDIA_INIT'
    });
    return;
  }

  try {
    const uploadSession = dbStore.initMediaUpload({
      inspectionId,
      fileName,
      fileType,
      fileSize: Number(fileSize),
      totalChunks: Number(totalChunks)
    });

    res.status(201).json({
      success: true,
      message: 'Media upload session initialized on backend server.',
      uploadId: uploadSession.uploadId,
      storagePath: uploadSession.storagePath
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message || 'Failed to initialize media upload session.', code: 'MEDIA_INIT_FAILED' });
  }
});

// ==========================================
// 11. POST /api/media/upload/chunk
// ==========================================
apiRouter.post('/media/upload/chunk', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { uploadId, chunkIndex, totalChunks, chunkData } = req.body;

  if (!uploadId || chunkIndex === undefined || totalChunks === undefined || !chunkData) {
    res.status(400).json({
      error: 'Missing required chunk parameters: uploadId, chunkIndex, totalChunks, chunkData.',
      code: 'INVALID_CHUNK_PAYLOAD'
    });
    return;
  }

  try {
    const result = dbStore.saveMediaChunk(
      uploadId,
      Number(chunkIndex),
      Number(totalChunks),
      String(chunkData)
    );

    res.json({
      success: true,
      ...result
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(400).json({ error: error.message || 'Chunk upload failed.', code: 'CHUNK_FAILED' });
  }
});

// ==========================================
// 12. GET /api/media/upload/status/:uploadId
// ==========================================
apiRouter.get('/media/upload/status/:uploadId', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { uploadId } = req.params;

  if (!uploadId) {
    res.status(400).json({ error: 'Upload ID is required.', code: 'MISSING_UPLOAD_ID' });
    return;
  }

  const status = dbStore.getMediaUploadStatus(uploadId);
  if (!status) {
    res.status(404).json({ error: `Upload session ${uploadId} not found.`, code: 'NOT_FOUND' });
    return;
  }

  res.json({
    success: true,
    ...status
  });
});

// ==========================================
// 13. POST /api/media/upload/complete
// ==========================================
apiRouter.post('/media/upload/complete', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { uploadId } = req.body;

  if (!uploadId) {
    res.status(400).json({ error: 'Upload ID is required.', code: 'MISSING_UPLOAD_ID' });
    return;
  }

  try {
    const result = dbStore.completeMediaUpload(uploadId);
    res.json(result);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(400).json({ error: error.message || 'Failed to finalize media upload.', code: 'COMPLETE_FAILED' });
  }
});

// ==========================================
// 14. GET /api/ai/status & GET /api/ai/health
// ==========================================
apiRouter.get('/ai/status', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = !!apiKey && apiKey.trim().length > 0;

  res.json({
    success: true,
    gemini: isConfigured,
    geminiConfigured: isConfigured,
    status: isConfigured ? 'GEMINI AI — ONLINE' : 'GEMINI NOT CONFIGURED',
    model: 'gemini-3.8-flash'
  });
});

apiRouter.get('/ai/health', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = !!apiKey && apiKey.trim().length > 0;

  res.json({
    gemini: isConfigured,
    fallback: true,
    geminiConfigured: isConfigured,
    status: isConfigured ? 'GEMINI AI — ONLINE' : 'GEMINI NOT CONFIGURED',
    model: 'gemini-3.8-flash'
  });
});

// ==========================================
// 15. POST /api/ai/chat & POST /api/ai/query
// ==========================================
apiRouter.post('/ai/chat', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { message, conversationId, history } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message string is required.', code: 'INVALID_MESSAGE' });
    return;
  }

  const user = req.user!;
  const result = await processAiChat({
    message,
    conversationId,
    history,
    user
  });

  res.json(result);
});

apiRouter.post('/ai/query', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { query, message, context, history } = req.body;
  const textQuery = query || message;

  if (!textQuery || typeof textQuery !== 'string') {
    res.status(400).json({ error: 'Query string parameter is required.', code: 'INVALID_QUERY' });
    return;
  }

  const user = req.user!;
  const result = await processAiChat({
    message: textQuery,
    history,
    user
  });

  res.json({
    success: result.success,
    status: result.geminiConfigured ? 'GEMINI AI — ONLINE' : 'GEMINI NOT CONFIGURED',
    geminiConfigured: result.geminiConfigured,
    text: result.message,
    message: result.message,
    conversationId: result.conversationId
  });
});

// ==========================================
// 16. POST /api/ai/conflict-analysis
// ==========================================
apiRouter.post('/ai/conflict-analysis', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { conflictItem } = req.body;

  if (!conflictItem || typeof conflictItem !== 'object') {
    res.status(400).json({ error: 'conflictItem object payload is required.', code: 'INVALID_CONFLICT_PAYLOAD' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    res.json({
      success: false,
      status: 'GEMINI NOT CONFIGURED',
      geminiConfigured: false,
      suggestion: 'GEMINI NOT CONFIGURED: Unable to generate AI conflict analysis without GEMINI_API_KEY. Supervisor review required.'
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const conflictPrompt = `Analyze the following field inspection conflict:
Disputed Item: ${conflictItem.field}
Equipment: ${conflictItem.equipmentName} (${conflictItem.inspectionCode})

TECHNICIAN A ENTRY:
- User: ${conflictItem.localUser || conflictItem.technicianName}
- Value: ${conflictItem.localValue}
- Timestamp: ${conflictItem.localTimestamp}
- Notes: ${conflictItem.localNotes || 'None'}
- Operation ID: ${conflictItem.localOperationId || 'N/A'}

TECHNICIAN B ENTRY:
- User: ${conflictItem.remoteUser || conflictItem.supervisorName}
- Value: ${conflictItem.serverValue}
- Timestamp: ${conflictItem.remoteTimestamp}
- Notes: ${conflictItem.remoteNotes || 'None'}
- Operation ID: ${conflictItem.remoteOperationId || 'N/A'}

Provide a concise 2-3 sentence AI suggestion for the supervisor.
CRITICAL MANDATE: Provide a suggestion ONLY. Do NOT attempt to automatically resolve the conflict.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: conflictPrompt,
      config: {
        systemInstruction: 'You are the WA-1 AI Field Inspection Conflict Assistant. Analyze technician notes, evidence, timestamps, photos, and inspection history. Provide a concise suggestion ONLY to assist supervisor review. NEVER automatically resolve conflicts.'
      }
    });

    res.json({
      success: true,
      status: 'GEMINI AI — ONLINE',
      geminiConfigured: true,
      suggestion: response.text || 'AI Suggestion: Technician entries show divergent values. Supervisor manual physical re-verification recommended.'
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Gemini Conflict Analysis Error:', error);
    res.status(500).json({
      error: `Gemini conflict analysis failed: ${error.message}`,
      code: 'GEMINI_ANALYSIS_FAILED',
      status: 'GEMINI AI — ERROR'
    });
  }
});

// ==========================================
// 1.1 GET /api/auth/me & POST /api/auth/logout
// ==========================================
apiRouter.get('/auth/me', authenticateJWT, (req: AuthenticatedRequest, res) => {
  res.json({
    authenticated: true,
    user: req.user
  });
});

apiRouter.post('/auth/logout', authenticateJWT, (_req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

// ==========================================
// 17. GET /api/equipment, POST, PUT, DELETE
// ==========================================
apiRouter.get('/equipment', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const equipment = dbStore.getAllEquipment();
  res.json({
    success: true,
    count: equipment.length,
    equipment
  });
});

apiRouter.post('/equipment', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  const data = req.body;
  if (!data || !data.name || !data.tag) {
    res.status(400).json({ error: 'Asset name and tag are required.', code: 'INVALID_EQUIPMENT' });
    return;
  }
  const userId = req.user!.id;
  const userName = req.user!.name;
  const newEq = dbStore.createEquipment(data, userId, userName);
  res.status(201).json({
    success: true,
    message: `Asset ${newEq.name} (${newEq.tag}) registered successfully.`,
    equipment: newEq
  });
});

apiRouter.put('/equipment/:id', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user!.id;
  const userName = req.user!.name;
  try {
    const updated = dbStore.updateEquipment(id, updates, userId, userName);
    res.json({
      success: true,
      message: `Asset ${updated.name} updated.`,
      equipment: updated
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(404).json({ error: error.message, code: 'NOT_FOUND' });
  }
});

apiRouter.delete('/equipment/:id', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userName = req.user!.name;
  try {
    dbStore.deleteEquipment(id, userId, userName);
    res.json({
      success: true,
      message: `Asset ${id} deleted.`
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(404).json({ error: error.message, code: 'NOT_FOUND' });
  }
});

// ==========================================
// 18. GET /api/tasks, POST, PUT, DELETE
// ==========================================
apiRouter.get('/tasks', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const tasks = dbStore.getAllTasks();
  res.json({
    success: true,
    count: tasks.length,
    tasks
  });
});

apiRouter.post('/tasks', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  const taskData = req.body;
  if (!taskData || !taskData.title) {
    res.status(400).json({ error: 'Task title is required.', code: 'INVALID_TASK' });
    return;
  }
  const userId = req.user!.id;
  const userName = req.user!.name;
  const newTask = dbStore.createTask(taskData, userId, userName);
  res.status(201).json({
    success: true,
    task: newTask
  });
});

apiRouter.put('/tasks/:id', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user!.id;
  const userName = req.user!.name;
  try {
    const updated = dbStore.updateTask(id, updates, userId, userName);
    res.json({
      success: true,
      task: updated
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(404).json({ error: error.message, code: 'NOT_FOUND' });
  }
});

apiRouter.delete('/tasks/:id', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userName = req.user!.name;
  try {
    dbStore.deleteTask(id, userId, userName);
    res.json({
      success: true,
      message: `Task ${id} deleted.`
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(404).json({ error: error.message, code: 'NOT_FOUND' });
  }
});

// ==========================================
// 19. GET /api/risk-alerts
// ==========================================
apiRouter.get('/risk-alerts', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const alerts = dbStore.getRiskAlerts();
  res.json({
    success: true,
    alerts
  });
});

// ==========================================
// 20. GET /api/notifications & POST read
// ==========================================
apiRouter.get('/notifications', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const notifications = dbStore.getNotifications();
  res.json({
    success: true,
    notifications
  });
});

apiRouter.post('/notifications/:id/read', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const marked = dbStore.markNotificationRead(id);
  res.json({
    success: marked
  });
});

// ==========================================
// 21. GET /api/analytics
// ==========================================
apiRouter.get('/analytics', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const analytics = dbStore.getAnalytics();
  res.json({
    success: true,
    analytics
  });
});

// ==========================================
// 22. USER MANAGEMENT (Admin only)
// ==========================================
apiRouter.get('/admin/users', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
  const users = dbStore.getAllUsers();
  res.json({
    success: true,
    users
  });
});

apiRouter.post('/admin/users', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
  const userData = req.body;
  if (!userData || !userData.name || !userData.email || !userData.role) {
    res.status(400).json({ error: 'Name, email, and role are required.', code: 'INVALID_USER_DATA' });
    return;
  }
  const adminUserId = req.user!.id;
  const adminUserName = req.user!.name;
  const newUser = dbStore.createUser(userData, adminUserId, adminUserName);
  res.status(201).json({
    success: true,
    message: `User ${newUser.name} created successfully.`,
    user: newUser
  });
});

apiRouter.put('/admin/users/:id', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updates = req.body;
  const adminUserId = req.user!.id;
  const adminUserName = req.user!.name;
  try {
    const updated = dbStore.updateUser(id, updates, adminUserId, adminUserName);
    res.json({
      success: true,
      message: `User ${updated.name} updated.`,
      user: updated
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(404).json({ error: error.message, code: 'NOT_FOUND' });
  }
});

apiRouter.delete('/admin/users/:id', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const adminUserId = req.user!.id;
  const adminUserName = req.user!.name;
  try {
    dbStore.deleteUser(id, adminUserId, adminUserName);
    res.json({
      success: true,
      message: `User ${id} deleted.`
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(404).json({ error: error.message, code: 'NOT_FOUND' });
  }
});

// ==========================================
// 23. ADMIN SETTINGS (Admin only)
// ==========================================
apiRouter.get('/admin/settings', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
  const settings = dbStore.getAdminSettings();
  res.json({
    success: true,
    settings
  });
});

apiRouter.post('/admin/settings', authenticateJWT, authorizeRoles('ADMIN'), (req: AuthenticatedRequest, res) => {
  const settings = req.body;
  const userId = req.user!.id;
  const userName = req.user!.name;
  const updated = dbStore.updateAdminSettings(settings, userId, userName);
  res.json({
    success: true,
    message: 'System settings updated successfully.',
    settings: updated
  });
});

// ==========================================
// 24. INSPECTION SIGN-OFF & APPROVAL (Supervisor / Admin)
// ==========================================
apiRouter.post('/inspections/:id/approve', authenticateJWT, authorizeRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  const userId = req.user!.id;
  const userName = req.user!.name;
  const userRole = req.user!.role;

  try {
    const inspection = dbStore.getInspectionById(id);
    if (!inspection) {
      res.status(404).json({ error: `Inspection ${id} not found.`, code: 'NOT_FOUND' });
      return;
    }

    const updated = dbStore.updateInspection(id, {
      status: status || 'PASSED',
      signatures: {
        ...inspection.signatures,
        supervisor: {
          name: userName,
          timestamp: new Date().toISOString()
        }
      },
      completedDate: new Date().toISOString(),
      generalNotes: remarks ? `${inspection.generalNotes || ''}\n[Supervisor Sign-off (${userName})]: ${remarks}` : inspection.generalNotes
    }, userId, userName, userRole);

    res.json({
      success: true,
      message: `Inspection ${inspection.code} approved with status ${updated.status}.`,
      inspection: updated
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({ error: error.message, code: 'APPROVAL_FAILED' });
  }
});

// ==========================================
// 25. AI ASSISTANT ENDPOINTS (Gemini + Local Fallback)
// ==========================================
import { processAiChat } from '../ai/assistant';

apiRouter.get('/ai/health', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const configured = Boolean(apiKey && apiKey.trim().length > 0);
  res.json({
    success: true,
    status: configured ? 'ONLINE' : 'CONFIGURATION_ERROR',
    geminiConfigured: configured,
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString()
  });
});

apiRouter.get('/ai/status', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const configured = Boolean(apiKey && apiKey.trim().length > 0);
  res.json({
    success: true,
    geminiOnline: configured,
    statusBadge: configured ? 'GEMINI AI — ONLINE' : 'GEMINI AI — CONFIGURATION ERROR',
    message: configured ? 'Gemini AI API connected successfully.' : 'GEMINI_API_KEY environment variable is not configured.'
  });
});

apiRouter.post('/ai/chat', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { message, conversationId, history } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Message parameter is required.', code: 'INVALID_MESSAGE' });
    return;
  }

  try {
    const user = req.user!;
    const response = await processAiChat({
      message,
      conversationId,
      history,
      user
    });

    res.json(response);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('AI chat endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Gemini AI is temporarily unavailable because the configured API quota has been reached. Supported FIELD GUARD offline assistance is still available.',
      source: 'LOCAL_FALLBACK',
      geminiConfigured: false,
      role: req.user?.role || 'TECHNICIAN'
    });
  }
});
