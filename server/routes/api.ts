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
// 14. GET /api/ai/status
// ==========================================
apiRouter.get('/ai/status', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = !!apiKey && apiKey.trim().length > 0;

  res.json({
    success: true,
    geminiConfigured: isConfigured,
    status: isConfigured ? 'GEMINI AI — ONLINE' : 'GEMINI NOT CONFIGURED',
    model: 'gemini-3.8-flash'
  });
});

// ==========================================
// 15. POST /api/ai/query
// ==========================================
apiRouter.post('/ai/query', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { query, context } = req.body;

  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Query string parameter is required.', code: 'INVALID_QUERY' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    res.json({
      success: false,
      status: 'GEMINI NOT CONFIGURED',
      geminiConfigured: false,
      message: 'GEMINI NOT CONFIGURED: GEMINI_API_KEY environment variable is not defined.'
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const promptText = `User Query: "${query}"\n${context ? `Context: ${JSON.stringify(context)}` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: 'You are the WA-1 Enterprise Field Inspection AI Assistant. Provide helpful, accurate engineering advice according to ISO 10816, NFPA 59A, OSHA 1910, and industrial equipment maintenance standards. Keep responses professional, clear, and scannable.'
      }
    });

    res.json({
      success: true,
      status: 'GEMINI AI — ONLINE',
      geminiConfigured: true,
      text: response.text || 'Analysis completed.'
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: `Gemini API invocation failed: ${error.message}`,
      code: 'GEMINI_API_ERROR',
      status: 'GEMINI AI — ERROR'
    });
  }
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
