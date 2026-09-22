import { GoogleGenAI } from '@google/genai';
import { dbStore, type DBInspection, type DBTask, type DBConflict, type DBEquipment } from '../db/store';
import type { JWTPayload, UserRole } from '../auth';

export interface ChatHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  conversationId?: string;
  source: 'GEMINI' | 'LOCAL_FALLBACK';
  geminiConfigured: boolean;
  role: UserRole;
}

/**
 * Builds authorized, real database context tailored to the user's role and identity.
 */
export function buildAuthorizedDatabaseContext(user: JWTPayload): string {
  const role = user.role;
  const userId = user.id;

  if (role === 'TECHNICIAN') {
    const allInspections: DBInspection[] = dbStore.getInspectionsByTechnician(userId);
    const pendingInspections = allInspections.filter((i: DBInspection) => i.status === 'IN_PROGRESS' || i.status === 'DRAFT');
    const completedInspections = allInspections.filter((i: DBInspection) => i.status === 'PASSED' || i.status === 'FAILED');
    const failedInspections = allInspections.filter((i: DBInspection) => i.status === 'FAILED');
    const allTasks: DBTask[] = dbStore.getTasksByTechnician(userId);
    const pendingTasks = allTasks.filter((t: DBTask) => t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED');
    const equipment: DBEquipment[] = dbStore.getAllEquipment();

    return JSON.stringify({
      userRole: 'TECHNICIAN',
      userName: user.name,
      userId: user.id,
      assignedInspectionsSummary: {
        totalAssigned: allInspections.length,
        pendingCount: pendingInspections.length,
        completedCount: completedInspections.length,
        failedCount: failedInspections.length,
        inspections: allInspections.map((i: DBInspection) => ({
          id: i.id,
          code: i.code,
          title: i.title,
          equipmentName: i.equipmentName,
          status: i.status,
          scheduledDate: i.scheduledDate,
          score: i.score,
          riskLevel: i.riskLevel,
          defectsCount: i.defects?.length || 0
        }))
      },
      assignedTasks: pendingTasks.map((t: DBTask) => ({
        id: t.id,
        title: t.title,
        equipmentName: t.equipmentName,
        priority: t.priority,
        dueDate: t.dueDate,
        status: t.status
      })),
      registeredEquipmentCount: equipment.length
    });
  }

  if (role === 'SUPERVISOR') {
    const allInspections: DBInspection[] = dbStore.getAllInspections();
    const failedInspections = allInspections.filter((i: DBInspection) => i.status === 'FAILED');
    const pendingReview = allInspections.filter((i: DBInspection) => i.status === 'PENDING_REVIEW');
    const inProgress = allInspections.filter((i: DBInspection) => i.status === 'IN_PROGRESS');
    const conflicts: DBConflict[] = dbStore.getAllConflicts().filter((c: DBConflict) => c.status === 'ACTIVE');
    const equipment: DBEquipment[] = dbStore.getAllEquipment();
    const needsMaintenance = equipment.filter((e: DBEquipment) => e.status === 'NEEDS_MAINTENANCE' || e.status === 'CRITICAL_OFFLINE');
    const allTasks: DBTask[] = dbStore.getAllTasks();

    return JSON.stringify({
      userRole: 'SUPERVISOR',
      userName: user.name,
      teamInspectionsSummary: {
        totalInspections: allInspections.length,
        failedCount: failedInspections.length,
        pendingReviewCount: pendingReview.length,
        inProgressCount: inProgress.length,
        activeConflictsCount: conflicts.length,
        failedInspectionsList: failedInspections.map((i: DBInspection) => ({
          code: i.code,
          equipmentName: i.equipmentName,
          technicianName: i.technicianName,
          score: i.score,
          scheduledDate: i.scheduledDate,
          defects: i.defects
        })),
        activeConflictsList: conflicts.map((c: DBConflict) => ({
          id: c.id,
          equipmentName: c.equipmentName,
          field: c.field,
          localValue: c.localValue,
          serverValue: c.serverValue,
          technicianName: c.technicianName
        }))
      },
      equipmentFleet: {
        totalCount: equipment.length,
        needsMaintenanceCount: needsMaintenance.length,
        machinesRequiringAttention: needsMaintenance.map((e: DBEquipment) => ({
          tag: e.tag,
          name: e.name,
          facility: e.facility,
          status: e.status,
          healthScore: e.healthScore,
          criticality: e.criticality
        }))
      },
      teamTasksCount: allTasks.length
    });
  }

  // ADMIN role
  const allInspections = dbStore.getAllInspections();
  const allEquipment = dbStore.getAllEquipment();
  const allUsers = dbStore.getAllUsers();
  const allConflicts = dbStore.getAllConflicts();
  const allAudit = dbStore.getAllAuditLogs();
  const analytics = dbStore.getAnalytics();

  return JSON.stringify({
    userRole: 'ADMIN',
    userName: user.name,
    organizationOverview: {
      totalInspections: allInspections.length,
      totalEquipment: allEquipment.length,
      totalPersonnel: allUsers.length,
      activeConflictsCount: allConflicts.filter((c: DBConflict) => c.status === 'ACTIVE').length,
      totalAuditEntries: allAudit.length,
      complianceAverageScore: analytics.complianceRate,
      averageEquipmentHealth: analytics.averageEquipmentHealth,
      totalDefects: analytics.totalDefects,
      criticalDefects: analytics.criticalDefects,
      inspectors: allUsers.map(u => ({ id: u.id, name: u.name, role: u.role, title: u.title }))
    }
  });
}

/**
 * Executes a Gemini Chat query with authorized data awareness and conversation memory.
 */
export async function processAiChat(params: {
  message: string;
  conversationId?: string;
  history?: ChatHistoryMessage[];
  user: JWTPayload;
}): Promise<ChatResponse> {
  const { message, conversationId, history = [], user } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      success: false,
      message: 'Gemini API is not configured on this server (GEMINI_API_KEY is missing). Please check environment settings or use local rules.',
      conversationId: conversationId || `conv-${Date.now()}`,
      source: 'LOCAL_FALLBACK',
      geminiConfigured: false,
      role: user.role
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const databaseContext = buildAuthorizedDatabaseContext(user);

    const systemInstruction = `You are the FIELD GUARD AI Field Engineering Assistant, an intelligent safety and reliability expert.

CRITICAL OPERATIONAL RULES:
1. You are talking to ${user.name}, who is authenticated with the role of ${user.role} (Badge: ${user.badgeNumber}).
2. AUTHENTICATED DATABASE AWARENESS:
   Below is the REAL, live, authorized database state for ${user.name}:
   \`\`\`json
   ${databaseContext}
   \`\`\`
   - When the user asks database-aware questions (e.g., "Show my pending inspections", "Show today's failed inspections", "What equipment needs maintenance?", "Are there any conflicts?", "What are my assigned tasks?"):
     - Base your answer STRICTLY on the real database records provided above.
     - If the records list 0 items or no matching records, explicitly state that no matching records were found (e.g. "No failed inspections were found in the database.").
     - DO NOT invent, hallucinate, or fabricate fake inspection numbers, equipment tags, or test values.
3. ROLE-BASED ACCESS CONTROL:
   - TECHNICIANS may only access their own assigned inspections, tasks, and general field procedures. If a technician asks for unauthorized private data or administrative settings, politely state that supervisory or administrator clearance is required.
   - SUPERVISORS have access to team-level inspections, failed inspection reviews, active conflicts, and fleet maintenance metrics.
   - ADMINS have complete access to org-level analytics, user accounts, audit ledgers, and system configurations.
4. TECHNICAL & SAFETY INSPECTION EXPERTISE:
   - Mandatory 4-Point Field Integrity Checklist:
     1. Pressure Gauge: Operating PSI must strictly sit inside the certified green arc tolerance; dial glass intact with zero dampening fluid leaks.
     2. Safety Seal: Tamper-evident copper anchor wire and lead seal unbroken, matching tag serial.
     3. Physical Damage: Enclosure casing free of impact dents (>0.5mm), weld fractures, arc flash marks.
     4. Expiry Date: Hydrostatic test date current for operating quarter; annual certification collar legible.
   - Inspection Status Definitions:
     - PASS: All physical and mechanical tolerances strictly within standard thresholds.
     - FAIL: Defect discovered, safety tolerance breached, or physical damage requiring remediation.
     - WARNING: Minor non-critical advisory note not compromising structural/pressure safety.
     - CONFLICT: Divergent entries between inspectors requiring supervisor manual sign-off.
   - Standards: ISO 10816 (Vibration / Mechanical severity), NFPA 10 / 59A (Safety relief valves & fire extinguishers), OSHA 1910.119 (Process safety).
5. CONVERSATION TONE & NATURAL ANSWERS:
   - If the user asks general questions ("Hello", "What is Python?", "Tell me about thermodynamics"), answer naturally and intelligently without shoehorning irrelevant inspection boilerplate.
   - If the user asks a follow-up question (e.g., "What if the needle is outside the green zone?"), use the conversation history to maintain context (referring to the pressure gauge previously discussed).
   - Keep responses professional, clear, and scannable using bolding and bullet points where helpful.`;

    // Construct conversation payload for multi-turn chat
    const cappedHistory = history.slice(-8); // keep last 8 turns for tight token usage
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const h of cappedHistory) {
      contents.push({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }]
      });
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents as any,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    const replyText = response.text || 'I have evaluated your query against FIELD GUARD safety specifications.';

    return {
      success: true,
      message: replyText,
      conversationId: conversationId || `conv-${Date.now()}`,
      source: 'GEMINI',
      geminiConfigured: true,
      role: user.role
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Gemini Assistant execution error:', error);
    return {
      success: false,
      message: `Gemini communication failed: ${error.message || 'Service unavailable'}. Reverting to local inspection rules engine.`,
      conversationId: conversationId || `conv-${Date.now()}`,
      source: 'LOCAL_FALLBACK',
      geminiConfigured: true,
      role: user.role
    };
  }
}
