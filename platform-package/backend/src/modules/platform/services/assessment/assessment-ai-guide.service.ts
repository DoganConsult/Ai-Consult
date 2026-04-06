// @ts-nocheck
// ============================================
// Assessment AI Guidance Service
// Provides AI-driven guidance, progress tracking,
// and scoring for assessment templates
// ============================================

import { safeQuery } from "../../../../config/database";
import { tenantSchema } from "../../../../config/database";

import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// ── Types ─────────────────────────────────

export interface QuestionGuidance {
  qid: string;
  domain: string;
  text_en: string;
  text_ar: string;
  evidenceHint: string;
  maxScore: number;
  aiGuide: {
    what_en: string; what_ar: string;
    how_en: string; how_ar: string;
    scoring_en: string; scoring_ar: string;
  };
}

export interface AssessmentProgress {
  assessmentId: string;
  templateId: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercent: number;
  domainProgress: { domain: string; total: number; answered: number; score: number; maxScore: number }[];
  overallScore: number;
  maxPossibleScore: number;
  maturityLevel: number;
  estimatedMinutesRemaining: number;
  nextUnansweredQuestion: string | null;
  startedAt: string | null;
  lastActivityAt: string | null;
}

export interface AIScoreSummary {
  overallScore: number;
  maturityLevel: number;
  maturityLabel: string;
  maturityLabelAr: string;
  domainScores: { domain: string; score: number; maxScore: number; maturity: number; gapPercent: number }[];
  topGaps: { domain: string; question: string; gap: number }[];
  recommendations: { priority: 'high' | 'medium' | 'low'; text_en: string; text_ar: string }[];
  executiveSummaryEn: string;
  executiveSummaryAr: string;
}

// ── Maturity labels ───────────────────────

const MATURITY_LABELS: Record<number, { en: string; ar: string }> = {
  1: { en: 'Initial / Ad-hoc', ar: 'أولي / عشوائي' },
  2: { en: 'Developing', ar: 'في طور التطوير' },
  3: { en: 'Defined', ar: 'محدد' },
  4: { en: 'Managed', ar: 'مُدار' },
  5: { en: 'Optimized', ar: 'محسّن' },
};

// ── Template lookup ───────────────────────

const TEMPLATE_MAP = new Map<string, AssessmentTemplateDefinition>();
for (const t of TEMPLATES) TEMPLATE_MAP.set(t.templateId, t);

function getTemplate(templateId: string): AssessmentTemplateDefinition | undefined {
  return TEMPLATE_MAP.get(templateId);
}

// ── AI Guidance for a question ────────────

export function getQuestionGuidance(templateId: string, questionId: string): QuestionGuidance | null {
  const tpl = getTemplate(templateId);
  if (!tpl) return null;
  const q = tpl.questions.find(qq => qq.qid === questionId);
  if (!q) return null;
  return q;
}

// ── All questions with guidance for a template ──

export function getTemplateQuestions(templateId: string): TemplateQuestion[] {
  const tpl = getTemplate(templateId);
  if (!tpl) return [];
  return tpl.questions;
}

// ── Get full template definition ──────────

export function getTemplateDefinition(templateId: string): AssessmentTemplateDefinition | null {
  return getTemplate(templateId) || null;
}

// ── Assessment Progress ───────────────────

export async function getAssessmentProgress(tenantId: string, assessmentId: string): Promise<AssessmentProgress | null> {
  const schema = tenantSchema(tenantId);

  // Get the assessment record
  const aRes = await safeQuery(
    `SELECT a.*, at.question_bank, at.template_id, at.estimated_minutes
     FROM "${schema}".assessments a
     LEFT JOIN "${schema}".assessment_templates at ON at.template_id = a.framework_id
     WHERE a.assessment_id = $1`,
    [assessmentId]
  );
  if (!aRes.rows.length) return null;
  const assessment = getFirstRow(aRes);

  // Get responses
  const rRes = await safeQuery(
    `SELECT * FROM "${schema}".assessment_responses WHERE assessment_id = $1`,
    [assessmentId]
  );
  const responses = rRes.rows;
  const responseMap = new Map<string, any>();
  for (const r of responses) responseMap.set(r.question_id, r);

  // Find matching template
  const templateId = assessment.template_id || assessment.framework_id;
  const tpl = getTemplate(templateId);
  const questions: TemplateQuestion[] = tpl ? tpl.questions :
    (assessment.question_bank ? (typeof assessment.question_bank === 'string' ? JSON.parse(assessment.question_bank) : assessment.question_bank) : []);

  const totalQuestions = questions.length;
  const answeredQuestions = responses.length;
  const completionPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // Domain progress
  const domainMap = new Map<string, { total: number; answered: number; score: number; maxScore: number }>();
  for (const q of questions) {
    const d = domainMap.get(q.domain) || { total: 0, answered: 0, score: 0, maxScore: 0 };
    d.total++;
    d.maxScore += q.maxScore;
    const resp = responseMap.get(q.qid);
    if (resp) {
      d.answered++;
      d.score += Number(resp.score) || 0;
    }
    domainMap.set(q.domain, d);
  }
  const domainProgress = Array.from(domainMap.entries()).map(([domain, d]) => ({ domain, ...d }));

  // Overall score
  const maxPossibleScore = questions.reduce((s, q) => s + q.maxScore, 0);
  const overallScore = responses.reduce((s: number, r: unknown) => s + (Number(r.score) || 0), 0);
  const maturityLevel = maxPossibleScore > 0 ? Math.round((overallScore / maxPossibleScore) * 5) : 0;

  // Next unanswered
  const answeredSet = new Set(responses.map((r: GenericRow) => r.question_id));
  const nextQ = questions.find(q => !answeredSet.has(q.qid));

  // Estimated time remaining
  const avgMinPerQ = (tpl?.estimatedMinutes || 60) / Math.max(totalQuestions, 1);
  const remaining = Math.round((totalQuestions - answeredQuestions) * avgMinPerQ);

  return {
    assessmentId,
    templateId,
    totalQuestions,
    answeredQuestions,
    completionPercent,
    domainProgress,
    overallScore,
    maxPossibleScore,
    maturityLevel: Math.max(1, Math.min(5, maturityLevel)),
    estimatedMinutesRemaining: remaining,
    nextUnansweredQuestion: nextQ?.qid || null,
    startedAt: assessment.created_at,
    lastActivityAt: responses.length > 0 ? responses[responses.length - 1].created_at : null,
  };
}

// ── AI Score Summary ──────────────────────

export async function getAIScoreSummary(tenantId: string, assessmentId: string): Promise<AIScoreSummary | null> {
  const progress = await getAssessmentProgress(tenantId, assessmentId);
  if (!progress) return null;

  const tpl = getTemplate(progress.templateId);
  if (!tpl) return null;

  const schema = tenantSchema(tenantId);
  const rRes = await safeQuery(
    `SELECT * FROM "${schema}".assessment_responses WHERE assessment_id = $1`,
    [assessmentId]
  );
  const responseMap = new Map<string, number>();
  for (const r of rRes.rows) responseMap.set(r.question_id, Number(r.score) || 0);

  // Domain scores
  const domainScores = progress.domainProgress.map(d => ({
    domain: d.domain,
    score: d.score,
    maxScore: d.maxScore,
    maturity: d.maxScore > 0 ? Math.max(1, Math.min(5, Math.round((d.score / d.maxScore) * 5))) : 1,
    gapPercent: d.maxScore > 0 ? Math.round(((d.maxScore - d.score) / d.maxScore) * 100) : 100,
  }));

  // Top gaps (questions with lowest scores)
  const topGaps = tpl.questions
    .map(q => ({
      domain: q.domain,
      question: q.text_en,
      gap: q.maxScore - (responseMap.get(q.qid) || 0),
    }))
    .filter(g => g.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);

  // Generate recommendations based on gaps
  const recommendations: AIScoreSummary['recommendations'] = [];
  const weakDomains = domainScores.filter(d => d.maturity <= 2).sort((a, b) => a.maturity - b.maturity);

  for (const wd of weakDomains.slice(0, 5)) {
    recommendations.push({
      priority: wd.maturity <= 1 ? 'high' : 'medium',
      text_en: `Strengthen "${wd.domain}" domain — currently at maturity level ${wd.maturity}/5 with ${wd.gapPercent}% gap. Focus on establishing documented processes and controls.`,
      text_ar: `عزز مجال "${wd.domain}" — حاليًا عند مستوى نضج ${wd.maturity}/5 بفجوة ${wd.gapPercent}%. ركز على إنشاء عمليات وضوابط موثقة.`,
    });
  }

  if (progress.maturityLevel <= 2) {
    recommendations.push({
      priority: 'high',
      text_en: 'Your overall maturity is at an early stage. Start by documenting key policies and establishing basic controls across all domains.',
      text_ar: 'نضجك العام في مرحلة مبكرة. ابدأ بتوثيق السياسات الرئيسية وإنشاء ضوابط أساسية عبر جميع المجالات.',
    });
  }

  const matLabel = MATURITY_LABELS[progress.maturityLevel] || MATURITY_LABELS[1];

  // Executive summary
  const completedPct = progress.completionPercent;
  const executiveSummaryEn = `Assessment "${tpl.nameEn}" is ${completedPct}% complete. Overall maturity level: ${progress.maturityLevel}/5 (${matLabel.en}). Score: ${progress.overallScore}/${progress.maxPossibleScore}. ${weakDomains.length > 0 ? `Key areas needing attention: ${weakDomains.map(d => d.domain).join(', ')}.` : 'All domains show acceptable maturity.'} ${topGaps.length > 0 ? `Top gap: ${topGaps[0].question}` : ''}`;

  const executiveSummaryAr = `التقييم "${tpl.nameAr}" مكتمل بنسبة ${completedPct}%. مستوى النضج العام: ${progress.maturityLevel}/5 (${matLabel.ar}). النتيجة: ${progress.overallScore}/${progress.maxPossibleScore}. ${weakDomains.length > 0 ? `المجالات الرئيسية التي تحتاج اهتمام: ${weakDomains.map(d => d.domain).join('، ')}.` : 'جميع المجالات تظهر نضجًا مقبولًا.'}`;

  return {
    overallScore: progress.overallScore,
    maturityLevel: progress.maturityLevel,
    maturityLabel: matLabel.en,
    maturityLabelAr: matLabel.ar,
    domainScores,
    topGaps,
    recommendations,
    executiveSummaryEn,
    executiveSummaryAr,
  };
}

// ── Tenant Template Config ────────────────

export async function getTenantTemplateConfig(tenantId: string): Promise<{ templateId: string; enabled: boolean }[]> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT template_id, enabled FROM "${schema}".assessment_templates WHERE is_system = true`
    );
    return res.rows.map((r: GenericRow) => ({ templateId: r.template_id, enabled: r.enabled }));
  } catch {
    return TEMPLATES.map(t => ({ templateId: t.templateId, enabled: true }));
  }
}

export async function updateTenantTemplateConfig(
  tenantId: string,
  configs: { templateId: string; enabled: boolean }[]
): Promise<void> {
  const schema = tenantSchema(tenantId);
  for (const c of configs) {
    await safeQuery(
      `UPDATE "${schema}".assessment_templates SET enabled = $1 WHERE template_id = $2`,
      [c.enabled, c.templateId]
    );
  }
}

// ── List templates with filtering ─────────

export interface TemplateFilter {
  category?: string;
  industry?: string;
  difficulty?: string;
  search?: string;
  sector?: string;
}

export async function getFilteredTemplates(tenantId: string, filter: TemplateFilter): Promise<any[]> {
  const schema = tenantSchema(tenantId);

  // Try to get from DB first
  let templates: unknown[] = [];
  try {
    const res = await safeQuery(
      `SELECT * FROM "${schema}".assessment_templates WHERE enabled = true ORDER BY category, name_en`
    );
    templates = res.rows;
  } catch {
    // Fallback to in-memory templates
    templates = TEMPLATES.map(t => ({
      template_id: t.templateId,
      name_en: t.nameEn,
      name_ar: t.nameAr,
      category: t.category,
      industry: t.industry,
      difficulty: t.difficulty,
      estimated_minutes: t.estimatedMinutes,
      description_en: t.descriptionEn,
      description_ar: t.descriptionAr,
      framework_id: t.frameworkId,
      scoring_methodology: t.scoringMethodology,
      question_count: t.questions.length,
      applicable_sectors: t.applicableSectors,
      tags: t.tags,
      is_system: true,
      enabled: true,
    }));
  }

  // Apply filters
  if (filter.category) {
    templates = templates.filter((t: GenericRow) => t.category === filter.category);
  }
  if (filter.industry) {
    templates = templates.filter((t: GenericRow) => t.industry === filter.industry || t.industry === 'all');
  }
  if (filter.difficulty) {
    templates = templates.filter((t: GenericRow) => t.difficulty === filter.difficulty);
  }
  if (filter.sector) {
    templates = templates.filter((t: GenericRow) => {
      const sectors = t.applicable_sectors || [];
      return sectors.includes('all') || sectors.includes(filter.sector);
    });
  }
  if (filter.search) {
    const s = filter.search.toLowerCase();
    templates = templates.filter((t: GenericRow) =>
      (t.name_en || '').toLowerCase().includes(s) ||
      (t.name_ar || '').includes(s) ||
      (t.description_en || '').toLowerCase().includes(s) ||
      (t.tags || []).some((tag: string) => tag.includes(s))
    );
  }

  // Enrich with question count from in-memory if missing
  return templates.map((t: GenericRow) => {
    const inMemory = TEMPLATE_MAP.get(t.template_id) as string;
    const questionBank = t.question_bank ? (typeof t.question_bank === 'string' ? JSON.parse(t.question_bank) : t.question_bank) : [];
    return {
      ...t,
      question_count: t.question_count || (inMemory ? inMemory.questions.length : questionBank.length),
      question_bank: undefined, // Don't send full question bank in list
      ai_guidance: undefined,   // Don't send full guidance in list
    };
  });
}

// ── Start assessment from template ────────

export async function startAssessmentFromTemplate(
  tenantId: string,
  templateId: string,
  userId: string,
  title?: string
): Promise<unknown> {
  const tpl = getTemplate(templateId);
  if (!tpl) throw new Error(`Template ${templateId} not found`);

  const schema = tenantSchema(tenantId);
  const assessmentId = require('crypto').randomUUID();
  const assessmentTitle = title || tpl.nameEn;

  // Create the assessment
  const res = await safeQuery(
    `INSERT INTO "${schema}".assessments
      (assessment_id, framework_id, title, status, score, created_by)
     VALUES ($1, $2, $3, 'in_progress', 0, $4)
     RETURNING *`,
    [assessmentId, templateId, assessmentTitle, userId]
  );

  return getFirstRow(res);
}

// ── Save response with auto-scoring ───────

export async function saveAssessmentResponse(
  tenantId: string,
  assessmentId: string,
  questionId: string,
  answer: unknown,
  score: number,
  userId: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Ensure assessment_responses table exists
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".assessment_responses (
      response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assessment_id VARCHAR(100) NOT NULL,
      question_id VARCHAR(100) NOT NULL,
      answer JSONB,
      score NUMERIC DEFAULT 0,
      responded_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id, question_id)
    )
  `);

  const res = await safeQuery(
    `INSERT INTO "${schema}".assessment_responses
      (assessment_id, question_id, answer, score, responded_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (assessment_id, question_id)
     DO UPDATE SET answer = EXCLUDED.answer, score = EXCLUDED.score, responded_by = EXCLUDED.responded_by, created_at = NOW()
     RETURNING *`,
    [assessmentId, questionId, JSON.stringify(answer), score, userId]
  );

  // Update overall assessment score
  const totalRes = await safeQuery(
    `SELECT COALESCE(SUM(score), 0)::numeric AS total FROM "${schema}".assessment_responses WHERE assessment_id = $1`,
    [assessmentId]
  );
  await safeQuery(
    `UPDATE "${schema}".assessments SET score = $1 WHERE assessment_id = $2`,
    [getFirstRow(totalRes)?.total, assessmentId]
  );

  return getFirstRow(res);
}

// ── Categories list ───────────────────────

export function getTemplateCategories(): { id: string; nameEn: string; nameAr: string; count: number }[] {
  const catMap = new Map<string, { nameEn: string; nameAr: string; count: number }>();

  const CAT_LABELS: Record<string, { en: string; ar: string }> = {
    ksa_regulatory: { en: 'KSA Regulatory', ar: 'تنظيمي سعودي' },
    international: { en: 'International Standards', ar: 'معايير دولية' },
    cybersecurity: { en: 'Cybersecurity', ar: 'الأمن السيبراني' },
    privacy: { en: 'Privacy', ar: 'الخصوصية' },
    risk: { en: 'Risk Management', ar: 'إدارة المخاطر' },
    governance: { en: 'Governance', ar: 'الحوكمة' },
    audit: { en: 'Audit', ar: 'التدقيق' },
    bcp: { en: 'Business Continuity', ar: 'استمرارية الأعمال' },
    vendor: { en: 'Vendor / Third-Party', ar: 'الموردين / الأطراف الثالثة' },
    technology: { en: 'Technology', ar: 'التقنية' },
    industry: { en: 'Industry-Specific', ar: 'خاص بالقطاع' },
    quick_start: { en: 'Quick Start', ar: 'بداية سريعة' },
  };

  for (const t of TEMPLATES) {
    const existing = catMap.get(t.category) || { nameEn: CAT_LABELS[t.category]?.en || t.category, nameAr: CAT_LABELS[t.category]?.ar || t.category, count: 0 };
    existing.count++;
    catMap.set(t.category, existing);
  }

  return Array.from(catMap.entries()).map(([id, v]) => ({ id, ...v }));
}
