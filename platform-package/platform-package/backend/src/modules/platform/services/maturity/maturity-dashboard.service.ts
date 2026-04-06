// @ts-nocheck
/**
 * Maturity Dashboard Service — GRC Maturity Scoring & Progress
 *
 * Pure functions for maturity score computation, phase progress tracking,
 * regression detection, and serialization. DB functions for snapshot
 * persistence. AI function for executive summary generation.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { gatewayJSON } from '../../../ai/services/gateway/ai-gateway.service';
import type {
  GRCRoadmap,
  RoadmapPhaseType,
  MaturityScore,
  MaturityComponent,
  TrendPoint,
  PhaseProgress,
  ExecutiveSummary,
} from '../../../../types/journey.types';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';

// ===========================================================================
// Constants
// ===========================================================================

/** Ordered list of roadmap phase types. */
const PHASE_ORDER: RoadmapPhaseType[] = [
  'foundation',
  'assessment',
  'implementation',
  'operations',
  'continuous_improvement',
];

/** Bilingual phase names for progress display. */
const PHASE_NAMES: Record<RoadmapPhaseType, { en: string; ar: string }> = {
  foundation:               { en: 'Foundation',             ar: 'التأسيس' },
  assessment:               { en: 'Assessment',             ar: 'التقييم' },
  implementation:           { en: 'Implementation',         ar: 'التنفيذ' },
  operations:               { en: 'Operations',             ar: 'العمليات' },
  continuous_improvement:   { en: 'Continuous Improvement',  ar: 'التحسين المستمر' },
};

/** Default component definitions for maturity scoring. */
const DEFAULT_COMPONENTS: { name: string; nameAr: string; defaultWeight: number }[] = [
  { name: 'Milestone Completion',  nameAr: 'إنجاز المعالم',       defaultWeight: 0.25 },
  { name: 'Control Coverage',      nameAr: 'تغطية الضوابط',       defaultWeight: 0.25 },
  { name: 'Evidence Coverage',     nameAr: 'تغطية الأدلة',        defaultWeight: 0.25 },
  { name: 'Assessment Results',    nameAr: 'نتائج التقييم',       defaultWeight: 0.25 },
];

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Compute the overall GRC maturity score from four input dimensions.
 *
 * Each input is a percentage (0-100). Framework weights allow prioritizing
 * certain components; if not provided, equal weights (0.25 each) are used.
 * The `frameworkWeights` keys map to component names:
 *   'milestoneCompletion', 'controlCoverage', 'evidenceCoverage', 'assessmentResults'
 *
 * Component weights are normalized to sum to 1.0.
 * The overall score is clamped to [0, 100].
 *
 * Requirement 6.1: Score 0-100
 * Requirement 6.2: Weights sum to 1.0
 */
export function computeMaturityScore(
  milestoneCompletion: number,
  controlCoverage: number,
  evidenceCoverage: number,
  assessmentResults: number,
  frameworkWeights: Record<string, number> = {},
): MaturityScore {
  // Clamp inputs to [0, 100]
  const inputs = [
    { key: 'milestoneCompletion', value: clamp(milestoneCompletion, 0, 100) },
    { key: 'controlCoverage',     value: clamp(controlCoverage, 0, 100) },
    { key: 'evidenceCoverage',    value: clamp(evidenceCoverage, 0, 100) },
    { key: 'assessmentResults',   value: clamp(assessmentResults, 0, 100) },
  ];

  // Resolve raw weights (use framework overrides or defaults)
  const rawWeights = inputs.map((inp, i) => {
    const fw = frameworkWeights[inp.key];
    return (fw !== undefined && fw > 0) ? fw : DEFAULT_COMPONENTS[i].defaultWeight;
  });

  // Normalize so weights sum to exactly 1.0
  const weightSum = rawWeights.reduce((s, w) => s + w, 0);
  const normalizedWeights = weightSum > 0
    ? rawWeights.map(w => w / weightSum)
    : rawWeights.map(() => 0.25); // fallback to equal

  // Build components
  const components: MaturityComponent[] = inputs.map((inp, i) => ({
    name: DEFAULT_COMPONENTS[i].name,
    nameAr: DEFAULT_COMPONENTS[i].nameAr,
    score: Math.round(inp.value * 100) / 100,
    weight: Math.round(normalizedWeights[i] * 10000) / 10000, // 4 decimal places
    details: `${DEFAULT_COMPONENTS[i].name}: ${inp.value.toFixed(1)}%`,
  }));

  // Compute weighted overall score, clamped to [0, 100]
  const rawOverall = components.reduce((sum, c) => sum + c.score * c.weight, 0);
  const overall = clamp(Math.round(rawOverall * 100) / 100, 0, 100);

  return {
    overall,
    components,
    trend: [],
    computedAt: new Date().toISOString(),
  };
}

/**
 * Compute phase progress for each of the 5 roadmap phases.
 *
 * Returns exactly 5 PhaseProgress entries, one per phase in order.
 * Each entry shows completion percentage (0-100), total tasks, and completed tasks.
 *
 * Requirement 6.3: Phase completion percentages
 * Requirement 6.6: Completed vs remaining tasks for active phase
 */
export function computePhaseProgress(roadmap: GRCRoadmap): PhaseProgress[] {
  // Build a map of phase data from the roadmap
  const phaseMap = new Map<RoadmapPhaseType, { total: number; completed: number; nameEn: string; nameAr: string }>();

  for (const phase of roadmap.phases) {
    let total = 0;
    let completed = 0;
    for (const ms of phase.milestones) {
      for (const task of ms.tasks) {
        total += 1;
        if (task.status === 'completed') completed += 1;
      }
    }
    phaseMap.set(phase.type, {
      total,
      completed,
      nameEn: phase.nameEn,
      nameAr: phase.nameAr,
    });
  }

  // Always return exactly 5 entries in the canonical order
  return PHASE_ORDER.map((phaseType) => {
    const data = phaseMap.get(phaseType);
    const total = data?.total ?? 0;
    const completed = data?.completed ?? 0;
    const completionPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      phaseType,
      nameEn: data?.nameEn ?? PHASE_NAMES[phaseType].en,
      nameAr: data?.nameAr ?? PHASE_NAMES[phaseType].ar,
      completionPercent: clamp(completionPercent, 0, 100),
      totalTasks: total,
      completedTasks: completed,
    };
  });
}

/**
 * Detect regressions between two maturity score snapshots.
 *
 * Returns all components whose score decreased from `previous` to `current`.
 * Matches components by name.
 *
 * Requirement 6.7: Highlight regression areas
 */
export function detectRegressions(
  current: MaturityScore,
  previous: MaturityScore,
): MaturityComponent[] {
  const previousMap = new Map<string, MaturityComponent>();
  for (const comp of previous.components) {
    previousMap.set(comp.name, comp);
  }

  const regressions: MaturityComponent[] = [];
  for (const comp of current.components) {
    const prev = previousMap.get(comp.name);
    if (prev && comp.score < prev.score) {
      regressions.push(comp);
    }
  }

  return regressions;
}

/**
 * Serialize a MaturityScore to a JSON string.
 */
export function serializeMaturityScore(score: MaturityScore): string {
  return JSON.stringify(score);
}

/**
 * Deserialize a JSON string back to a MaturityScore.
 * Throws if the JSON is invalid.
 */
export function deserializeMaturityScore(json: string): MaturityScore {
  const parsed = JSON.parse(json);
  return parsed as MaturityScore;
}

// ===========================================================================
// DB Functions
// ===========================================================================

/**
 * Save a maturity score snapshot to the database.
 */
export async function saveMaturitySnapshot(
  tenantId: string,
  score: MaturityScore,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".maturity_snapshots
       (tenant_id, overall_score, components, computed_at)
     VALUES ($1, $2, $3, $4)`,
    [
      tenantId,
      score.overall,
      JSON.stringify(score.components),
      score.computedAt,
    ],
  );
}

/**
 * Retrieve maturity score history for a tenant, ordered by most recent first.
 * Returns an array of MaturityScore objects with trend data populated.
 */
export async function getMaturityHistory(
  tenantId: string,
  limit = 30,
): Promise<MaturityScore[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT snapshot_id, overall_score, components, computed_at
     FROM "${schema}".maturity_snapshots
     WHERE tenant_id = $1
     ORDER BY computed_at DESC
     LIMIT $2`,
    [tenantId, limit],
  );

  return result.rows.map((row: GenericRow) => ({
    overall: parseFloat(row.overall_score),
    components: row.components ?? [],
    trend: [],
    computedAt: row.computed_at instanceof Date
      ? row.computed_at.toISOString()
      : row.computed_at,
  }));
}

/**
 * Get the latest maturity score for a tenant.
 * Returns null if no snapshots exist.
 * Populates the trend array from historical data.
 */
export async function getLatestMaturity(
  tenantId: string,
): Promise<MaturityScore | null> {
  const schema = tenantSchema(tenantId);

  // Get the latest snapshot
  const latestResult = await safeQuery(
    `SELECT snapshot_id, overall_score, components, computed_at
     FROM "${schema}".maturity_snapshots
     WHERE tenant_id = $1
     ORDER BY computed_at DESC
     LIMIT 1`,
    [tenantId],
  );

  if (latestResult.rows.length === 0) return null;

  const row = getFirstRow(latestResult);

  // Get trend data (last 30 data points)
  const trendResult = await safeQuery(
    `SELECT overall_score, computed_at
     FROM "${schema}".maturity_snapshots
     WHERE tenant_id = $1
     ORDER BY computed_at ASC
     LIMIT 30`,
    [tenantId],
  );

  const trend: TrendPoint[] = trendResult.rows.map((r: GenericRow) => ({
    date: r.computed_at instanceof Date ? r.computed_at.toISOString() : r.computed_at,
    score: parseFloat(r.overall_score),
  }));

  return {
    overall: parseFloat(row.overall_score),
    components: row.components ?? [],
    trend,
    computedAt: row.computed_at instanceof Date
      ? row.computed_at.toISOString()
      : row.computed_at,
  };
}

// ===========================================================================
// AI Functions
// ===========================================================================

/**
 * Generate a bilingual executive summary using Claude AI.
 *
 * Fetches the latest maturity score and roadmap data, then asks Claude
 * to produce a board-ready summary in English and Arabic.
 *
 * Requirement 6.4: AI-powered bilingual executive summary
 */
export async function generateExecutiveSummary(
  tenantId: string,
): Promise<ExecutiveSummary> {
  // Gather context data
  const maturity = await getLatestMaturity(tenantId);
  const { getRoadmap } = await import('../../../agrc-engine/services/engine/roadmap-builder.service');
  const roadmap = await getRoadmap(tenantId);

  const phaseProgress = roadmap ? computePhaseProgress(roadmap) : [];

  const contextData = {
    maturityScore: maturity?.overall ?? 0,
    components: maturity?.components ?? [],
    phaseProgress,
    trend: maturity?.trend ?? [],
  };

  try {
    const result = await gatewayJSON<{
      summaryEn: string;
      summaryAr: string;
      highlights: { en: string; ar: string }[];
      riskAreas: { en: string; ar: string }[];
      recommendations: { en: string; ar: string }[];
    }>({
      systemPrompt: `You are a GRC (Governance, Risk & Compliance) executive advisor for a Saudi Arabian organization.
Generate a bilingual executive summary suitable for board presentation.
Respond in JSON format with the following structure:
{
  "summaryEn": "English executive summary paragraph",
  "summaryAr": "Arabic executive summary paragraph",
  "highlights": [{"en": "highlight in English", "ar": "highlight in Arabic"}],
  "riskAreas": [{"en": "risk area in English", "ar": "risk area in Arabic"}],
  "recommendations": [{"en": "recommendation in English", "ar": "recommendation in Arabic"}]
}
Provide 2-4 items for highlights, riskAreas, and recommendations each.`,
      userMessage: `Generate an executive summary based on this GRC maturity data:\n${JSON.stringify(contextData, null, 2)}`,
      tenantId,
    });

    return {
      ...result,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // Fallback: template-based summary if Claude is unavailable
    return buildFallbackSummary(contextData);
  }
}

// ===========================================================================
// Helpers
// ===========================================================================

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** Build a template-based fallback summary when Claude is unavailable. */
function buildFallbackSummary(context: {
  maturityScore: number;
  components: MaturityComponent[];
  phaseProgress: PhaseProgress[];
}): ExecutiveSummary {
  const score = context.maturityScore;
  const level = score >= 80 ? 'Advanced' : score >= 60 ? 'Moderate' : score >= 40 ? 'Basic' : 'Initial';
  const levelAr = score >= 80 ? 'متقدم' : score >= 60 ? 'متوسط' : score >= 40 ? 'أساسي' : 'أولي';

  return {
    summaryEn: `The organization's GRC maturity score is ${score.toFixed(1)} out of 100, placing it at the ${level} level. Continued focus on control implementation and evidence collection will drive further improvement.`,
    summaryAr: `درجة نضج الحوكمة والمخاطر والامتثال للمنظمة هي ${score.toFixed(1)} من 100، مما يضعها في المستوى ${levelAr}. سيؤدي التركيز المستمر على تنفيذ الضوابط وجمع الأدلة إلى مزيد من التحسين.`,
    highlights: [
      { en: `Overall maturity score: ${score.toFixed(1)}/100`, ar: `درجة النضج الإجمالية: ${score.toFixed(1)}/100` },
    ],
    riskAreas: context.components
      .filter(c => c.score < 50)
      .map(c => ({ en: `${c.name} is below target at ${c.score.toFixed(1)}%`, ar: `${c.nameAr} أقل من الهدف عند ${c.score.toFixed(1)}%` })),
    recommendations: [
      { en: 'Focus on improving areas with scores below 50%', ar: 'التركيز على تحسين المجالات التي تقل درجاتها عن 50%' },
    ],
    generatedAt: new Date().toISOString(),
  };
}
