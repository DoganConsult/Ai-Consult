// @ts-nocheck
import { catchHandler, EC } from '../../../../utils/resilient-catch';
// ============================================
// Shahin — SOP / Procedure Library Service
// Standard Operating Procedures linked to each
// process template stage and role. Bilingual.
// ============================================

import { query, safeQuery, tenantSchema } from '../../../../config/database';
import { getFirstRow } from '../../../../utils/db-utils';

export interface SOProcedure {
  sopId?: string;
  processType: string;
  stageId: string;
  roleId: string;
  titleEn: string;
  titleAr: string;
  stepsEn: string[];
  stepsAr: string[];
  prerequisites?: string;
  expectedOutput?: string;
  slaHours?: number;
  version?: number;
  status?: string;
}

// ── Ensure table ───────────────────────────────────────────────────────────

async function ensureTable(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".sop_procedures (
      sop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      process_type VARCHAR(50) NOT NULL,
      stage_id VARCHAR(50) NOT NULL,
      role_id VARCHAR(50) NOT NULL,
      title_en VARCHAR(300) NOT NULL,
      title_ar VARCHAR(300) NOT NULL,
      steps_en JSONB NOT NULL DEFAULT '[]',
      steps_ar JSONB NOT NULL DEFAULT '[]',
      prerequisites TEXT,
      expected_output TEXT,
      sla_hours INT,
      version INT DEFAULT 1,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sop_process ON "${schema}".sop_procedures (process_type, stage_id);
  `);
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function getSOPs(
  tenantId: string,
  opts?: { processType?: string; stageId?: string; roleId?: string }
): Promise<SOProcedure[]> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);

  const conditions: string[] = ['status = \'active\''];
  const params: unknown[] = [];
  let idx = 1;
  if (opts?.processType) { conditions.push(`process_type = $${idx++}`); params.push(opts.processType); }
  if (opts?.stageId) { conditions.push(`stage_id = $${idx++}`); params.push(opts.stageId); }
  if (opts?.roleId) { conditions.push(`role_id = $${idx++}`); params.push(opts.roleId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await safeQuery(
    `SELECT * FROM "${schema}".sop_procedures ${where} ORDER BY process_type, stage_id, role_id`,
    params
  );
  return result.rows.map(rowToSOP);
}

export async function upsertSOP(tenantId: string, sop: SOProcedure): Promise<SOProcedure> {
  const schema = tenantSchema(tenantId);
  await ensureTable(schema);

  if (sop.sopId) {
    await safeQuery(
      `UPDATE "${schema}".sop_procedures SET
         process_type=$1, stage_id=$2, role_id=$3, title_en=$4, title_ar=$5,
         steps_en=$6, steps_ar=$7, prerequisites=$8, expected_output=$9,
         sla_hours=$10, version=version+1, updated_at=NOW()
       WHERE sop_id=$11`,
      [sop.processType, sop.stageId, sop.roleId, sop.titleEn, sop.titleAr,
       JSON.stringify(sop.stepsEn), JSON.stringify(sop.stepsAr),
       sop.prerequisites, sop.expectedOutput, sop.slaHours, sop.sopId]
    );
    return sop;
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".sop_procedures
       (process_type, stage_id, role_id, title_en, title_ar, steps_en, steps_ar, prerequisites, expected_output, sla_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING sop_id`,
    [sop.processType, sop.stageId, sop.roleId, sop.titleEn, sop.titleAr,
     JSON.stringify(sop.stepsEn), JSON.stringify(sop.stepsAr),
     sop.prerequisites, sop.expectedOutput, sop.slaHours]
  );
  return { ...sop, sopId: getFirstRow(result)?.sop_id };
}

export async function deleteSOP(tenantId: string, sopId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`UPDATE "${schema}".sop_procedures SET status='archived', updated_at=NOW() WHERE sop_id=$1`, [sopId]);
}

// ── SOP Completion Tracking ────────────────────────────────────────────────

export interface SOPCompletion {
  completionId?: string;
  sopId: string;
  userId: string;
  completedSteps: number[];
  totalSteps: number;
  status: 'in_progress' | 'completed' | 'skipped';
  notes?: string;
  startedAt?: string;
  completedAt?: string;
}

async function ensureCompletionTable(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".sop_completions (
      completion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sop_id UUID NOT NULL REFERENCES "${schema}".sop_procedures(sop_id),
      user_id VARCHAR(64) NOT NULL,
      completed_steps JSONB NOT NULL DEFAULT '[]',
      total_steps INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
      notes TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sop_completion_user ON "${schema}".sop_completions (user_id, sop_id);
    CREATE INDEX IF NOT EXISTS idx_sop_completion_sop ON "${schema}".sop_completions (sop_id, status);
  `).catch(catchHandler(EC.EVENT_BUS, {}));
}

export async function startSOPCompletion(
  tenantId: string,
  sopId: string,
  userId: string,
  totalSteps: number
): Promise<SOPCompletion> {
  const schema = tenantSchema(tenantId);
  await ensureCompletionTable(schema);

  // Check for existing in-progress completion
  const existing = await safeQuery(
    `SELECT * FROM "${schema}".sop_completions WHERE sop_id=$1 AND user_id=$2 AND status='in_progress' LIMIT 1`,
    [sopId, userId]
  );
  if (existing.rows.length > 0) {
    return rowToCompletion(getFirstRow(existing));
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".sop_completions (sop_id, user_id, total_steps) VALUES ($1, $2, $3) RETURNING *`,
    [sopId, userId, totalSteps]
  );
  return rowToCompletion(getFirstRow(result));
}

export async function updateSOPProgress(
  tenantId: string,
  completionId: string,
  completedSteps: number[],
  notes?: string
): Promise<SOPCompletion> {
  const schema = tenantSchema(tenantId);
  await ensureCompletionTable(schema);

  const current = await safeQuery(
    `SELECT * FROM "${schema}".sop_completions WHERE completion_id=$1`, [completionId]
  );
  if (current.rows.length === 0) throw new Error('Completion record not found');

  const totalSteps = getFirstRow(current)?.total_steps;
  const allDone = completedSteps.length >= totalSteps;
  const status = allDone ? 'completed' : 'in_progress';

  const result = await safeQuery(
    `UPDATE "${schema}".sop_completions SET
       completed_steps=$1, status=$2, notes=COALESCE($3, notes),
       completed_at=${allDone ? 'NOW()' : 'NULL'}
     WHERE completion_id=$4 RETURNING *`,
    [JSON.stringify(completedSteps), status, notes || null, completionId]
  );
  return rowToCompletion(getFirstRow(result));
}

export async function getSOPCompletions(
  tenantId: string,
  opts?: { sopId?: string; userId?: string; status?: string; limit?: number }
): Promise<SOPCompletion[]> {
  const schema = tenantSchema(tenantId);
  await ensureCompletionTable(schema);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (opts?.sopId) { conditions.push(`sop_id = $${idx++}`); params.push(opts.sopId); }
  if (opts?.userId) { conditions.push(`user_id = $${idx++}`); params.push(opts.userId); }
  if (opts?.status) { conditions.push(`status = $${idx++}`); params.push(opts.status); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT * FROM "${schema}".sop_completions ${where} ORDER BY created_at DESC LIMIT ${opts?.limit || 100}`,
    params
  );
  return result.rows.map(rowToCompletion);
}

export async function getSOPComplianceStats(tenantId: string): Promise<{
  totalSOPs: number;
  completedByUsers: number;
  inProgress: number;
  complianceRate: number;
}> {
  const schema = tenantSchema(tenantId);
  await ensureCompletionTable(schema);

  const [sopCount, completedCount, inProgressCount] = await Promise.all([
    query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".sop_procedures WHERE status='active'`),
    query(`SELECT COUNT(DISTINCT sop_id || '-' || user_id)::int AS cnt FROM "${schema}".sop_completions WHERE status='completed'`),
    query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".sop_completions WHERE status='in_progress'`),
  ]);

  const total = getFirstRow(sopCount)?.cnt || 0;
  const completed = getFirstRow(completedCount)?.cnt || 0;
  const inProg = getFirstRow(inProgressCount)?.cnt || 0;

  return {
    totalSOPs: total,
    completedByUsers: completed,
    inProgress: inProg,
    complianceRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function rowToCompletion(row: any): SOPCompletion {
  return {
    completionId: row.completion_id,
    sopId: row.sop_id,
    userId: row.user_id,
    completedSteps: Array.isArray(row.completed_steps) ? row.completed_steps : JSON.parse(row.completed_steps || '[]'),
    totalSteps: row.total_steps,
    status: row.status,
    notes: row.notes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

// ── Seed default SOPs ──────────────────────────────────────────────────────

export async function seedDefaultSOPs(tenantId: string): Promise<number> {
  const existing = await getSOPs(tenantId);
  if (existing.length > 0) return 0;

  let count = 0;
  for (const sop of DEFAULT_SOPS) {
    await upsertSOP(tenantId, sop);
    count++;
  }
  return count;
}

function rowToSOP(row: any): SOProcedure {
  return {
    sopId: row.sop_id,
    processType: row.process_type,
    stageId: row.stage_id,
    roleId: row.role_id,
    titleEn: row.title_en,
    titleAr: row.title_ar,
    stepsEn: Array.isArray(row.steps_en) ? row.steps_en : JSON.parse(row.steps_en || '[]'),
    stepsAr: Array.isArray(row.steps_ar) ? row.steps_ar : JSON.parse(row.steps_ar || '[]'),
    prerequisites: row.prerequisites,
    expectedOutput: row.expected_output,
    slaHours: row.sla_hours,
    version: row.version,
    status: row.status,
  };
}


// ── Default SOP Library (bilingual) ────────────────────────────────────────

const DEFAULT_SOPS: SOProcedure[] = [
  // ── Policy Lifecycle ─────────────────────────────────────────────────────
  {
    processType: 'policy-lifecycle', stageId: 'draft', roleId: 'compliance_officer',
    titleEn: 'Draft New Policy', titleAr: 'صياغة سياسة جديدة',
    stepsEn: [
      'Identify the regulatory requirement or business need triggering the policy.',
      'Review existing policies for overlap or conflict.',
      'Draft the policy using the organization template.',
      'Include scope, objectives, responsibilities, and enforcement clauses.',
      'Tag applicable frameworks (NCA ECC, SAMA CSF, ISO 27001, etc.).',
      'Submit for peer review.',
    ],
    stepsAr: [
      'تحديد المتطلب التنظيمي أو الحاجة التجارية التي تستدعي السياسة.',
      'مراجعة السياسات الحالية لتجنب التداخل أو التعارض.',
      'صياغة السياسة باستخدام قالب المؤسسة.',
      'تضمين النطاق والأهداف والمسؤوليات وبنود التنفيذ.',
      'ربط الأطر التنظيمية المعمول بها (NCA ECC، SAMA CSF، ISO 27001، إلخ).',
      'تقديم للمراجعة من الأقران.',
    ],
    prerequisites: 'Regulatory requirement identified', expectedOutput: 'Draft policy document', slaHours: 72,
  },
  {
    processType: 'policy-lifecycle', stageId: 'review', roleId: 'compliance_officer',
    titleEn: 'Review Policy Draft', titleAr: 'مراجعة مسودة السياسة',
    stepsEn: [
      'Verify policy aligns with applicable regulatory frameworks.',
      'Check for completeness: scope, roles, enforcement, review date.',
      'Collect feedback from stakeholders (legal, IT, business units).',
      'Document review comments and required changes.',
      'Update draft based on feedback.',
    ],
    stepsAr: [
      'التحقق من توافق السياسة مع الأطر التنظيمية المعمول بها.',
      'التحقق من الاكتمال: النطاق، الأدوار، التنفيذ، تاريخ المراجعة.',
      'جمع الملاحظات من أصحاب المصلحة (القانونية، تقنية المعلومات، وحدات الأعمال).',
      'توثيق ملاحظات المراجعة والتغييرات المطلوبة.',
      'تحديث المسودة بناءً على الملاحظات.',
    ],
    prerequisites: 'Draft policy submitted', expectedOutput: 'Reviewed policy with comments', slaHours: 48,
  },
  {
    processType: 'policy-lifecycle', stageId: 'approve', roleId: 'ciso',
    titleEn: 'Approve Policy', titleAr: 'اعتماد السياسة',
    stepsEn: [
      'Review final policy draft and all review comments.',
      'Verify all stakeholder feedback has been addressed.',
      'Check authority matrix for required approval level.',
      'Sign off on the policy (digital signature or approval record).',
      'Set next review date (per governance constitution cadence).',
    ],
    stepsAr: [
      'مراجعة المسودة النهائية للسياسة وجميع ملاحظات المراجعة.',
      'التحقق من معالجة جميع ملاحظات أصحاب المصلحة.',
      'التحقق من مصفوفة الصلاحيات لمستوى الاعتماد المطلوب.',
      'التوقيع على السياسة (توقيع رقمي أو سجل اعتماد).',
      'تحديد تاريخ المراجعة القادم (وفقاً لإيقاع دستور الحوكمة).',
    ],
    prerequisites: 'Policy reviewed and comments addressed', expectedOutput: 'Approved policy', slaHours: 24,
  },

  // ── Risk Assessment ──────────────────────────────────────────────────────
  {
    processType: 'risk-assessment', stageId: 'identify', roleId: 'risk_manager',
    titleEn: 'Identify and Register Risks', titleAr: 'تحديد وتسجيل المخاطر',
    stepsEn: [
      'Conduct risk identification workshops with business unit owners.',
      'Review threat intelligence feeds and telemetry signals.',
      'Categorize risks: operational, compliance, financial, strategic, reputational.',
      'Register each risk with title, description, category, and initial owner.',
      'Link risks to applicable controls and frameworks.',
    ],
    stepsAr: [
      'إجراء ورش عمل لتحديد المخاطر مع مالكي وحدات الأعمال.',
      'مراجعة تغذيات استخبارات التهديدات وإشارات القياس عن بُعد.',
      'تصنيف المخاطر: تشغيلية، امتثال، مالية، استراتيجية، سمعة.',
      'تسجيل كل خطر بالعنوان والوصف والفئة والمالك الأولي.',
      'ربط المخاطر بالضوابط والأطر التنظيمية المعمول بها.',
    ],
    prerequisites: 'Risk assessment cycle initiated', expectedOutput: 'Updated risk register', slaHours: 48,
  },
  {
    processType: 'risk-assessment', stageId: 'analyze', roleId: 'risk_manager',
    titleEn: 'Analyze Risk Likelihood and Impact', titleAr: 'تحليل احتمالية وأثر المخاطر',
    stepsEn: [
      'Assess likelihood on 1-5 scale using historical data and threat intelligence.',
      'Assess impact on 1-5 scale across confidentiality, integrity, availability.',
      'Compute risk score (likelihood × impact).',
      'Compare against risk appetite thresholds from governance constitution.',
      'Flag risks exceeding appetite for escalation.',
    ],
    stepsAr: [
      'تقييم الاحتمالية على مقياس 1-5 باستخدام البيانات التاريخية واستخبارات التهديدات.',
      'تقييم الأثر على مقياس 1-5 عبر السرية والسلامة والتوفر.',
      'حساب درجة المخاطرة (الاحتمالية × الأثر).',
      'المقارنة مع عتبات شهية المخاطر من دستور الحوكمة.',
      'تمييز المخاطر التي تتجاوز الشهية للتصعيد.',
    ],
    prerequisites: 'Risks registered', expectedOutput: 'Scored risk register', slaHours: 72,
  },

  // ── Incident Response ────────────────────────────────────────────────────
  {
    processType: 'incident-response', stageId: 'detect', roleId: 'it_security_officer',
    titleEn: 'Detect and Classify Incident', titleAr: 'كشف وتصنيف الحادثة',
    stepsEn: [
      'Monitor SIEM alerts and telemetry signals for anomalies.',
      'Validate the alert — confirm it is a real incident (not false positive).',
      'Classify severity: critical, high, medium, low.',
      'Create incident record with initial details.',
      'Notify incident response team per escalation thresholds.',
    ],
    stepsAr: [
      'مراقبة تنبيهات SIEM وإشارات القياس عن بُعد للكشف عن الشذوذ.',
      'التحقق من التنبيه — تأكيد أنه حادثة حقيقية (وليس إنذار كاذب).',
      'تصنيف الخطورة: حرج، مرتفع، متوسط، منخفض.',
      'إنشاء سجل الحادثة بالتفاصيل الأولية.',
      'إخطار فريق الاستجابة للحوادث وفقاً لعتبات التصعيد.',
    ],
    prerequisites: 'Alert received', expectedOutput: 'Classified incident record', slaHours: 1,
  },
  {
    processType: 'incident-response', stageId: 'contain', roleId: 'it_security_officer',
    titleEn: 'Contain the Incident', titleAr: 'احتواء الحادثة',
    stepsEn: [
      'Isolate affected systems from the network.',
      'Preserve forensic evidence (logs, memory dumps, disk images).',
      'Block malicious IPs/domains at firewall/proxy.',
      'Disable compromised accounts.',
      'Document all containment actions taken.',
    ],
    stepsAr: [
      'عزل الأنظمة المتأثرة عن الشبكة.',
      'حفظ الأدلة الجنائية (السجلات، تفريغ الذاكرة، صور الأقراص).',
      'حظر عناوين IP/النطاقات الخبيثة في جدار الحماية/البروكسي.',
      'تعطيل الحسابات المخترقة.',
      'توثيق جميع إجراءات الاحتواء المتخذة.',
    ],
    prerequisites: 'Incident classified', expectedOutput: 'Contained incident', slaHours: 4,
  },

  // ── Vendor Assessment ────────────────────────────────────────────────────
  {
    processType: 'vendor-assessment', stageId: 'classify', roleId: 'risk_manager',
    titleEn: 'Classify Vendor Risk Tier', titleAr: 'تصنيف مستوى مخاطر المورد',
    stepsEn: [
      'Determine vendor data access level (none, limited, full).',
      'Assess business criticality (can operations continue without this vendor?).',
      'Assign risk tier: Tier 1 (critical), Tier 2 (important), Tier 3 (standard).',
      'Validate against vendor gate enforcement rules.',
      'Document classification rationale.',
    ],
    stepsAr: [
      'تحديد مستوى وصول المورد للبيانات (لا يوجد، محدود، كامل).',
      'تقييم الأهمية التجارية (هل يمكن استمرار العمليات بدون هذا المورد؟).',
      'تعيين مستوى المخاطر: المستوى 1 (حرج)، المستوى 2 (مهم)، المستوى 3 (عادي).',
      'التحقق مقابل قواعد بوابة إنفاذ الموردين.',
      'توثيق مبررات التصنيف.',
    ],
    prerequisites: 'Vendor onboarding request', expectedOutput: 'Classified vendor record', slaHours: 24,
  },

  // ── Internal Audit ───────────────────────────────────────────────────────
  {
    processType: 'audit', stageId: 'plan', roleId: 'auditor',
    titleEn: 'Plan Internal Audit', titleAr: 'تخطيط التدقيق الداخلي',
    stepsEn: [
      'Define audit scope based on risk assessment and compliance gaps.',
      'Select audit team and assign roles.',
      'Create audit plan with timeline and milestones.',
      'Notify auditees and schedule interviews.',
      'Prepare evidence request list.',
    ],
    stepsAr: [
      'تحديد نطاق التدقيق بناءً على تقييم المخاطر وفجوات الامتثال.',
      'اختيار فريق التدقيق وتعيين الأدوار.',
      'إنشاء خطة التدقيق مع الجدول الزمني والمعالم.',
      'إخطار الجهات المدققة وجدولة المقابلات.',
      'إعداد قائمة طلبات الأدلة.',
    ],
    prerequisites: 'Audit cycle initiated', expectedOutput: 'Approved audit plan', slaHours: 48,
  },

  // ── BCP ──────────────────────────────────────────────────────────────────
  {
    processType: 'bcp', stageId: 'bia', roleId: 'bcp_coordinator',
    titleEn: 'Conduct Business Impact Analysis', titleAr: 'إجراء تحليل أثر الأعمال',
    stepsEn: [
      'Identify critical business processes and their dependencies.',
      'Determine Recovery Time Objective (RTO) for each process.',
      'Determine Recovery Point Objective (RPO) for each process.',
      'Assess financial and operational impact of downtime.',
      'Prioritize processes by criticality and impact.',
      'Document BIA results and get management sign-off.',
    ],
    stepsAr: [
      'تحديد العمليات التجارية الحرجة وتبعياتها.',
      'تحديد هدف وقت الاسترداد (RTO) لكل عملية.',
      'تحديد هدف نقطة الاسترداد (RPO) لكل عملية.',
      'تقييم الأثر المالي والتشغيلي لفترة التوقف.',
      'ترتيب العمليات حسب الأهمية والأثر.',
      'توثيق نتائج تحليل أثر الأعمال والحصول على موافقة الإدارة.',
    ],
    prerequisites: 'BCP cycle initiated', expectedOutput: 'BIA report', slaHours: 96,
  },
];
