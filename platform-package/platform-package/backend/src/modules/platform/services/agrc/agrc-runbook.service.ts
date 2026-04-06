import { catchHandler, EC } from '../../../../utils/resilient-catch';
import { logger } from '../../../../platform/dos/observability/services/logger.service';
// ============================================
// Shahin GRC — AGRC-OS Runbook Service
// Automated response playbooks triggered by
// EventBus events. Each runbook defines
// automated steps + human escalation points.
// ============================================

import { safeQuery, tenantSchema } from '../../../../config/database';
import { eventBus, type PlatformEvent } from '../event/event-bus.service';
import { toErrorMessage } from '../../../../utils/http-error.util';

export interface RunbookStep {
  order: number;
  actionType: 'notify' | 'create_task' | 'escalate' | 'block' | 'log' | 'ai_analyze';
  targetRole?: string;
  description: string;
  descriptionAr: string;
  params?: Record<string, any>;
}

export interface EscalationPoint {
  level: number;
  timeoutHours: number;
  notifyRole: string;
  action: string;
}

export interface Runbook {
  runbookId?: string;
  triggerEvent: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  automatedSteps: RunbookStep[];
  humanEscalationPoints: EscalationPoint[];
  severityThreshold: string;
  enabled: boolean;
  version?: number;
}

// ── Ensure table ───────────────────────────────────────────────────────────

async function ensureTable(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".agrc_runbooks (
      runbook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trigger_event VARCHAR(60) NOT NULL,
      name_en VARCHAR(300) NOT NULL,
      name_ar VARCHAR(300) NOT NULL,
      description_en TEXT,
      description_ar TEXT,
      automated_steps JSONB NOT NULL DEFAULT '[]',
      human_escalation_points JSONB NOT NULL DEFAULT '[]',
      severity_threshold VARCHAR(20) DEFAULT 'warning',
      enabled BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_runbook_trigger ON "${schema}".agrc_runbooks (trigger_event);
  `);
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function getRunbooks(tenantId: string, triggerEvent?: string): Promise<Runbook[]> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);
  const where = triggerEvent ? `WHERE trigger_event = $1` : '';
  const params = triggerEvent ? [triggerEvent] : [];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".agrc_runbooks ${where} ORDER BY trigger_event, name_en`, params
  );
  return result.rows.map(rowToRunbook);
}

export async function upsertRunbook(tenantId: string, rb: Runbook): Promise<Runbook> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);

  if (rb.runbookId) {
    await safeQuery(
      `UPDATE "${schema}".agrc_runbooks SET
         trigger_event=$1, name_en=$2, name_ar=$3, description_en=$4, description_ar=$5,
         automated_steps=$6, human_escalation_points=$7, severity_threshold=$8,
         enabled=$9, version=version+1, updated_at=NOW()
       WHERE runbook_id=$10`,
      [rb.triggerEvent, rb.nameEn, rb.nameAr, rb.descriptionEn, rb.descriptionAr,
       JSON.stringify(rb.automatedSteps), JSON.stringify(rb.humanEscalationPoints),
       rb.severityThreshold, rb.enabled, rb.runbookId]
    );
    return rb;
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".agrc_runbooks
       (trigger_event, name_en, name_ar, description_en, description_ar,
        automated_steps, human_escalation_points, severity_threshold, enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING runbook_id`,
    [rb.triggerEvent, rb.nameEn, rb.nameAr, rb.descriptionEn, rb.descriptionAr,
     JSON.stringify(rb.automatedSteps), JSON.stringify(rb.humanEscalationPoints),
     rb.severityThreshold, rb.enabled]
  );
  return { ...rb, runbookId: result.rows[0].runbook_id };
}

export async function deleteRunbook(tenantId: string, runbookId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${schema}".agrc_runbooks WHERE runbook_id=$1`, [runbookId]);
}

// ── Execute runbook for an event ───────────────────────────────────────────

export async function executeRunbooks(tenantId: string, event: PlatformEvent): Promise<number> {
  const schema = tenantSchema(tenantId);
  await ensureExecutionTable(schema);

  const runbooks = await getRunbooks(tenantId, event.eventType);
  const applicable = runbooks.filter(rb => rb.enabled);
  let executed = 0;

  for (const rb of applicable) {
    const SEVERITY_ORDER = ['info', 'warning', 'critical'];
    const eventLevel = SEVERITY_ORDER.indexOf(event.severity);
    const thresholdLevel = SEVERITY_ORDER.indexOf(rb.severityThreshold);
    if (eventLevel < thresholdLevel) continue;

    const execStart = Date.now();
    const stepResults: { order: number; actionType: string; status: string; error?: string; durationMs: number }[] = [];

    for (const step of rb.automatedSteps) {
      const stepStart = Date.now();
      try {
        await executeStep(tenantId, event, step);
        stepResults.push({ order: step.order, actionType: step.actionType, status: 'success', durationMs: Date.now() - stepStart });
      } catch (err: unknown) {
        logger.error(`[Runbook] Step ${step.order} failed for ${rb.nameEn}: ${toErrorMessage(err)}`);
        stepResults.push({ order: step.order, actionType: step.actionType, status: 'failed', error: toErrorMessage(err), durationMs: Date.now() - stepStart });
      }
    }

    const failedSteps = stepResults.filter(s => s.status === 'failed').length;
    const execStatus = failedSteps === 0 ? 'success' : failedSteps === stepResults.length ? 'failed' : 'partial';

    // Persist execution record
    await safeQuery(
      `INSERT INTO "${schema}".runbook_execution_log
         (runbook_id, runbook_name, trigger_event, event_id, event_severity, step_results, status, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [rb.runbookId, rb.nameEn, event.eventType, event.eventId || null, event.severity,
       JSON.stringify(stepResults), execStatus, Date.now() - execStart]
    ).catch((err: unknown) => logger.error(`[Runbook] Failed to log execution: ${toErrorMessage(err)}`));

    executed++;
  }
  return executed;
}

// ── Get runbook execution history ──────────────────────────────────────────

export async function getRunbookExecutionHistory(
  tenantId: string,
  opts?: { runbookId?: string; status?: string; limit?: number }
): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  await ensureExecutionTable(schema);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (opts?.runbookId) { conditions.push(`runbook_id = $${idx++}`); params.push(opts.runbookId); }
  if (opts?.status) { conditions.push(`status = $${idx++}`); params.push(opts.status); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts?.limit || 100;

  const result = await safeQuery(
    `SELECT * FROM "${schema}".runbook_execution_log ${where} ORDER BY executed_at DESC LIMIT ${limit}`,
    params
  );
  return result.rows;
}

async function ensureExecutionTable(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".runbook_execution_log (
      execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      runbook_id UUID,
      runbook_name VARCHAR(300),
      trigger_event VARCHAR(60) NOT NULL,
      event_id UUID,
      event_severity VARCHAR(20),
      step_results JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(20) NOT NULL DEFAULT 'success',
      duration_ms INT DEFAULT 0,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_runbook_exec_runbook ON "${schema}".runbook_execution_log (runbook_id, executed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runbook_exec_event ON "${schema}".runbook_execution_log (trigger_event, executed_at DESC);
  `).catch(catchHandler(EC.EVENT_BUS, {}));
}

async function executeStep(tenantId: string, event: PlatformEvent, step: RunbookStep): Promise<void> {
  switch (step.actionType) {
    case 'notify': {
      const { createNotification } = await import('../../../notification/services/notification.service');
      const { query: dbQuery } = await import('../../../../config/database');
      const admins = await dbQuery(
        `SELECT user_id FROM users WHERE tenant_id=$1 AND role IN ($2, 'admin', 'owner') LIMIT 5`,
        [tenantId, step.targetRole || 'admin']
      );
      for (const admin of admins.rows) {
        await createNotification(tenantId, {
          userId: admin.user_id,
          type: `runbook_${event.eventType}`,
          title: `[AGRC-OS] ${step.description}`,
          body: `Event: ${event.eventType} | Entity: ${event.entityId || 'N/A'} | Severity: ${event.severity}`,
          link: '/agrc-os',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }
      break;
    }
    case 'escalate': {
      const { createNotification } = await import('../../../notification/services/notification.service');
      const { query: dbQuery } = await import('../../../../config/database');
      const owners = await dbQuery(
        `SELECT user_id FROM users WHERE tenant_id=$1 AND role='owner' LIMIT 3`, [tenantId]
      );
      for (const owner of owners.rows) {
        await createNotification(tenantId, {
          userId: owner.user_id,
          type: 'runbook_escalation',
          title: `[ESCALATION] ${step.description}`,
          body: `Automated escalation for ${event.eventType}. Severity: ${event.severity}. Immediate action required.`,
          link: '/agrc-os',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }
      break;
    }
    case 'log': {
      const { recordAudit } = await import('../../../audit/services/audit/core/audit-trail.service');
      await recordAudit({
        tenantId, userId: 'agrc-os-runbook', module: 'agrc_os',
        action: 'runbook_executed', entityType: event.entityType || 'runbook',
        entityId: event.entityId || '', afterState: { step: step.description, event: event.eventType },
      });
      break;
    }
    case 'block': {
      // Create an enforcement block record and notify admins
      const { query: dbQuery, tenantSchema: tSchema } = await import('../../../../config/database');
      const schema = tSchema(tenantId);
      await dbQuery(`
        CREATE TABLE IF NOT EXISTS "${schema}".runbook_blocks (
          block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type VARCHAR(60) NOT NULL,
          entity_type VARCHAR(60),
          entity_id VARCHAR(200),
          reason TEXT NOT NULL,
          blocked_by VARCHAR(100) DEFAULT 'agrc-os-runbook',
          resolved BOOLEAN DEFAULT FALSE,
          resolved_by VARCHAR(64),
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await dbQuery(
        `INSERT INTO "${schema}".runbook_blocks (event_type, entity_type, entity_id, reason)
         VALUES ($1, $2, $3, $4)`,
        [event.eventType, event.entityType || null, event.entityId || null, step.description]
      );
      // Audit the block
      const { recordAudit: auditBlock } = await import('../../../audit/services/audit/core/audit-trail.service');
      await auditBlock({
        tenantId, userId: 'agrc-os-runbook', module: 'agrc_os',
        action: 'block', entityType: event.entityType || 'runbook_block',
        entityId: event.entityId || '', afterState: { reason: step.description, event: event.eventType },
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      // Notify admins about the block
      const { createNotification: notifyBlock } = await import('../../../notification/services/notification.service');
      const blockAdmins = await dbQuery(
        `SELECT user_id FROM users WHERE tenant_id=$1 AND role IN ('admin','owner') LIMIT 5`, [tenantId]
      );
      for (const a of blockAdmins.rows) {
        await notifyBlock(tenantId, {
          userId: a.user_id, type: 'runbook_block',
          title: `[AGRC-OS] Action Blocked: ${step.description}`,
          body: `Runbook auto-blocked due to ${event.eventType}. Entity: ${event.entityId || 'N/A'}. Manual resolution required.`,
          link: '/agrc-os',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }
      break;
    }
    case 'create_task': {
      // Create a real task in the tasks table assigned to the target role
      const { query: dbQuery2, tenantSchema: tSchema2 } = await import('../../../../config/database');
      const taskSchema = tSchema2(tenantId);
      await dbQuery2(`
        CREATE TABLE IF NOT EXISTS "${taskSchema}".agrc_tasks (
          task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(500) NOT NULL,
          description TEXT,
          assigned_role VARCHAR(50),
          assigned_to VARCHAR(64),
          source_event VARCHAR(60),
          source_entity_type VARCHAR(60),
          source_entity_id VARCHAR(200),
          priority VARCHAR(20) DEFAULT 'medium',
          status VARCHAR(20) DEFAULT 'open',
          due_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      // Determine priority from event severity
      const priorityMap: Record<string, string> = { critical: 'critical', warning: 'high', info: 'medium' };
      const priority = priorityMap[event.severity] || 'medium';
      // Set due date based on priority
      const dueHours = priority === 'critical' ? 24 : priority === 'high' ? 72 : 168;
      await dbQuery2(
        `INSERT INTO "${taskSchema}".agrc_tasks
           (title, description, assigned_role, source_event, source_entity_type, source_entity_id, priority, due_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '${dueHours} hours')`,
        [
          step.description,
          `Auto-created by runbook for event ${event.eventType}. Entity: ${event.entityId || 'N/A'}. Severity: ${event.severity}.`,
          step.targetRole || 'admin',
          event.eventType,
          event.entityType || null,
          event.entityId || null,
          priority,
        ]
      );
      // Audit the task creation
      const { recordAudit: auditTask } = await import('../../../audit/services/audit/core/audit-trail.service');
      await auditTask({
        tenantId, userId: 'agrc-os-runbook', module: 'agrc_os',
        action: 'create', entityType: 'agrc_task', entityId: '',
        afterState: { title: step.description, assignedRole: step.targetRole, priority, event: event.eventType },
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      break;
    }
    case 'ai_analyze': {
      // Use Claude to analyze the event and store the analysis
      const { query: dbQuery3, tenantSchema: tSchema3 } = await import('../../../../config/database');
      const aiSchema = tSchema3(tenantId);
      await dbQuery3(`
        CREATE TABLE IF NOT EXISTS "${aiSchema}".runbook_ai_analyses (
          analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type VARCHAR(60) NOT NULL,
          entity_type VARCHAR(60),
          entity_id VARCHAR(200),
          prompt TEXT NOT NULL,
          analysis TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      const prompt = `Analyze this GRC event and provide actionable recommendations:\n` +
        `Event: ${event.eventType}\nSeverity: ${event.severity}\n` +
        `Entity: ${event.entityType || 'N/A'} (${event.entityId || 'N/A'})\n` +
        `Context: ${step.description}\nPayload: ${JSON.stringify(event.payload)}`;
      let analysis = 'Analysis pending — AI service unavailable';
      let status = 'pending';
      try {
        const { chatCompletion } = await import('../../../ai/services/gateway/llm.service');
        const aiResult = await chatCompletion([{ role: 'user', content: prompt }]);
        analysis = aiResult?.content || JSON.stringify(aiResult);
        status = 'completed';
      } catch {
        status = 'failed';
      }
      await dbQuery3(
        `INSERT INTO "${aiSchema}".runbook_ai_analyses
           (event_type, entity_type, entity_id, prompt, analysis, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [event.eventType, event.entityType || null, event.entityId || null, prompt, analysis, status]
      );
      // Audit the AI analysis
      const { recordAudit: auditAI } = await import('../../../audit/services/audit/core/audit-trail.service');
      await auditAI({
        tenantId, userId: 'agrc-os-runbook', module: 'agrc_os',
        action: 'ai_analyze', entityType: event.entityType || 'ai_analysis',
        entityId: event.entityId || '', afterState: { status, eventType: event.eventType },
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      break;
    }
  }
}

// ── Register EventBus subscribers for runbook execution ────────────────────

export function registerRunbookSubscribers(): void {
  const triggerEvents: string[] = [
    'control.stale', 'risk.exceeded_appetite', 'gate.blocked',
    'delta.detected', 'telemetry.threat_high', 'escalation.triggered',
    'constitution.breach', 'incident.created', 'incident.escalated',
  ];

  for (const eventType of triggerEvents) {
    eventBus.subscribe(eventType, `runbook-executor-${eventType}`, async (event) => {
      try {
        await executeRunbooks(event.tenantId, event);
      } catch (err: unknown) {
        logger.error(`[Runbook] Execution failed for ${eventType}: ${toErrorMessage(err)}`);
      }
    });
  }
  logger.info(`[Runbook] Registered ${triggerEvents.length} EventBus subscribers`);
}

// ── Seed default runbooks ──────────────────────────────────────────────────

export async function seedDefaultRunbooks(tenantId: string): Promise<number> {
  const existing = await getRunbooks(tenantId);
  if (existing.length > 0) return 0;

  let count = 0;
  for (const rb of DEFAULT_RUNBOOKS) {
    await upsertRunbook(tenantId, rb);
    count++;
  }
  return count;
}

function rowToRunbook(row: any): Runbook {
  return {
    runbookId: row.runbook_id, triggerEvent: row.trigger_event,
    nameEn: row.name_en, nameAr: row.name_ar,
    descriptionEn: row.description_en, descriptionAr: row.description_ar,
    automatedSteps: Array.isArray(row.automated_steps) ? row.automated_steps : JSON.parse(row.automated_steps || '[]'),
    humanEscalationPoints: Array.isArray(row.human_escalation_points) ? row.human_escalation_points : JSON.parse(row.human_escalation_points || '[]'),
    severityThreshold: row.severity_threshold, enabled: row.enabled, version: row.version,
  };
}


// ── Default Runbooks ───────────────────────────────────────────────────────

const DEFAULT_RUNBOOKS: Runbook[] = [
  {
    triggerEvent: 'control.stale',
    nameEn: 'Stale Control Response', nameAr: 'استجابة الضابط المتقادم',
    descriptionEn: 'When a control becomes stale, notify the owner and escalate if not addressed.',
    descriptionAr: 'عند تقادم ضابط، إخطار المالك والتصعيد إذا لم يتم التعامل معه.',
    automatedSteps: [
      { order: 1, actionType: 'notify', targetRole: 'compliance_officer', description: 'Notify control owner about stale control', descriptionAr: 'إخطار مالك الضابط بتقادم الضابط' },
      { order: 2, actionType: 'create_task', targetRole: 'compliance_officer', description: 'Create remediation task for stale control', descriptionAr: 'إنشاء مهمة معالجة للضابط المتقادم' },
      { order: 3, actionType: 'log', description: 'Log stale control event to audit trail', descriptionAr: 'تسجيل حدث تقادم الضابط في سجل التدقيق' },
    ],
    humanEscalationPoints: [
      { level: 1, timeoutHours: 48, notifyRole: 'risk_manager', action: 'Review and reassign control' },
      { level: 2, timeoutHours: 96, notifyRole: 'owner', action: 'Executive review of stale control' },
    ],
    severityThreshold: 'warning', enabled: true,
  },
  {
    triggerEvent: 'risk.exceeded_appetite',
    nameEn: 'Risk Appetite Breach Response', nameAr: 'استجابة تجاوز شهية المخاطر',
    descriptionEn: 'When a risk exceeds the defined appetite threshold, trigger immediate review.',
    descriptionAr: 'عند تجاوز خطر لعتبة الشهية المحددة، تفعيل مراجعة فورية.',
    automatedSteps: [
      { order: 1, actionType: 'notify', targetRole: 'risk_manager', description: 'Alert risk manager about appetite breach', descriptionAr: 'تنبيه مدير المخاطر بتجاوز الشهية' },
      { order: 2, actionType: 'escalate', targetRole: 'owner', description: 'Escalate to executive for risk acceptance decision', descriptionAr: 'تصعيد للإدارة التنفيذية لقرار قبول المخاطر' },
      { order: 3, actionType: 'log', description: 'Log appetite breach to audit trail', descriptionAr: 'تسجيل تجاوز الشهية في سجل التدقيق' },
    ],
    humanEscalationPoints: [
      { level: 1, timeoutHours: 24, notifyRole: 'risk_manager', action: 'Propose risk treatment plan' },
      { level: 2, timeoutHours: 48, notifyRole: 'owner', action: 'Accept or reject risk' },
    ],
    severityThreshold: 'warning', enabled: true,
  },
  {
    triggerEvent: 'gate.blocked',
    nameEn: 'Gate Block Response', nameAr: 'استجابة حظر البوابة',
    descriptionEn: 'When an enforcement gate blocks a release or vendor, notify and log.',
    descriptionAr: 'عند حظر بوابة إنفاذ لإصدار أو مورد، الإخطار والتسجيل.',
    automatedSteps: [
      { order: 1, actionType: 'notify', targetRole: 'admin', description: 'Notify admin about blocked gate', descriptionAr: 'إخطار المسؤول بالبوابة المحظورة' },
      { order: 2, actionType: 'log', description: 'Log gate block decision', descriptionAr: 'تسجيل قرار حظر البوابة' },
    ],
    humanEscalationPoints: [
      { level: 1, timeoutHours: 24, notifyRole: 'owner', action: 'Review and override if justified' },
    ],
    severityThreshold: 'warning', enabled: true,
  },
  {
    triggerEvent: 'delta.detected',
    nameEn: 'Regulatory Change Response', nameAr: 'استجابة التغيير التنظيمي',
    descriptionEn: 'When a regulatory delta is detected, assess impact and notify affected teams.',
    descriptionAr: 'عند اكتشاف تغيير تنظيمي، تقييم الأثر وإخطار الفرق المتأثرة.',
    automatedSteps: [
      { order: 1, actionType: 'notify', targetRole: 'compliance_officer', description: 'Notify compliance team about regulatory change', descriptionAr: 'إخطار فريق الامتثال بالتغيير التنظيمي' },
      { order: 2, actionType: 'ai_analyze', description: 'AI analyzes impact on current controls', descriptionAr: 'تحليل الذكاء الاصطناعي لأثر التغيير على الضوابط الحالية' },
      { order: 3, actionType: 'create_task', targetRole: 'compliance_officer', description: 'Create gap analysis task for new requirements', descriptionAr: 'إنشاء مهمة تحليل فجوات للمتطلبات الجديدة' },
      { order: 4, actionType: 'log', description: 'Log regulatory delta detection', descriptionAr: 'تسجيل اكتشاف التغيير التنظيمي' },
    ],
    humanEscalationPoints: [
      { level: 1, timeoutHours: 72, notifyRole: 'compliance_officer', action: 'Complete impact assessment' },
      { level: 2, timeoutHours: 168, notifyRole: 'owner', action: 'Approve remediation plan' },
    ],
    severityThreshold: 'info', enabled: true,
  },
  {
    triggerEvent: 'telemetry.threat_high',
    nameEn: 'High Threat Response', nameAr: 'استجابة التهديد المرتفع',
    descriptionEn: 'When telemetry indicates high threat probability, trigger incident response.',
    descriptionAr: 'عند إشارة القياس عن بُعد لاحتمالية تهديد مرتفعة، تفعيل الاستجابة للحوادث.',
    automatedSteps: [
      { order: 1, actionType: 'notify', targetRole: 'it_security_officer', description: 'Alert security team about high threat', descriptionAr: 'تنبيه فريق الأمن بالتهديد المرتفع' },
      { order: 2, actionType: 'escalate', targetRole: 'ciso', description: 'Escalate to CISO for immediate review', descriptionAr: 'تصعيد لرئيس أمن المعلومات للمراجعة الفورية' },
      { order: 3, actionType: 'log', description: 'Log high threat event', descriptionAr: 'تسجيل حدث التهديد المرتفع' },
    ],
    humanEscalationPoints: [
      { level: 1, timeoutHours: 4, notifyRole: 'it_security_officer', action: 'Investigate and contain' },
      { level: 2, timeoutHours: 12, notifyRole: 'owner', action: 'Executive incident briefing' },
    ],
    severityThreshold: 'critical', enabled: true,
  },
  {
    triggerEvent: 'constitution.breach',
    nameEn: 'Constitution Breach Response', nameAr: 'استجابة خرق الدستور',
    descriptionEn: 'When governance constitution rules are breached, enforce corrective action.',
    descriptionAr: 'عند خرق قواعد دستور الحوكمة، فرض إجراء تصحيحي.',
    automatedSteps: [
      { order: 1, actionType: 'notify', targetRole: 'owner', description: 'Notify organization owner about constitution breach', descriptionAr: 'إخطار مالك المؤسسة بخرق الدستور' },
      { order: 2, actionType: 'block', description: 'Block further actions until breach is resolved', descriptionAr: 'حظر الإجراءات الإضافية حتى حل الخرق' },
      { order: 3, actionType: 'log', description: 'Log constitution breach to audit trail', descriptionAr: 'تسجيل خرق الدستور في سجل التدقيق' },
    ],
    humanEscalationPoints: [
      { level: 1, timeoutHours: 12, notifyRole: 'owner', action: 'Review and resolve breach' },
    ],
    severityThreshold: 'critical', enabled: true,
  },
];
