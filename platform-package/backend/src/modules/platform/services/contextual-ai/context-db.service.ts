// @ts-nocheck
/**
 * Context DB Service — Database Operations
 *
 * AI session persistence, entity summary generation via Claude,
 * and cross-entity recommendation queries.
 *
 * Requirements: 4.4, 4.5, 4.9
 * Tasks: 13.5, 13.7, 13.8
 */

import { emptyResult, query, safeQuery, tenantSchema } from '../../../../config/database/database';
import { gatewayComplete } from '../../../ai/services/gateway/ai-gateway.service';
import { getFirstRow } from '../../../../shared/data/db-utils';
import type { PageContext, AISuggestion, AISession, EntitySummary } from './contextual-ai.types';
import { swallowDefault, EC } from '../../../../platform/dos/resilience/resilient-catch';

// ============================================================================
// Session Operations
// ============================================================================

/**
 * Create or get an AI session for a user.
 */
export async function getOrCreateSession(
  tenantId: string,
  userId: string,
  context: PageContext
): Promise<AISession> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(
    `SELECT session_id as "sessionId", user_id as "userId", context, messages,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM ${schema}.ai_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC LIMIT 1`,
    [userId]
  );

  if (existing.rows.length > 0) {
    const row = getFirstRow(existing);
    return {
      ...row,
      context: row.context || context,
      messages: row.messages || [],
    };
  }

  const result = await safeQuery(
    `INSERT INTO ${schema}.ai_sessions (user_id, context, messages)
     VALUES ($1, $2, $3)
     RETURNING session_id as "sessionId", user_id as "userId", context, messages,
               created_at as "createdAt", updated_at as "updatedAt"`,
    [userId, JSON.stringify(context), JSON.stringify([])]
  );

  return getFirstRow(result);
}

/**
 * Update session context in the database.
 */
export async function updateSessionContext(
  tenantId: string,
  sessionId: string,
  context: PageContext
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE ${schema}.ai_sessions SET context = $1, updated_at = NOW() WHERE session_id = $2`,
    [JSON.stringify(context), sessionId]
  );
}

// ============================================================================
// Entity Summary
// ============================================================================

/**
 * Generate an entity summary using AI.
 * Requirements: 4.4, 4.9
 */
export async function generateEntitySummary(
  tenantId: string,
  entityType: string,
  entityId: string,
  language: 'en' | 'ar' = 'en'
): Promise<EntitySummary> {
  // Fetch entity data based on type with correct primary key columns
  const schema = tenantSchema(tenantId);
  const tableConfig: Record<string, { table: string; pk: string }> = {
    risk: { table: 'risks', pk: 'risk_id' },
    control: { table: 'controls', pk: 'control_id' },
    policy: { table: 'policies', pk: 'policy_id' },
    incident: { table: 'incidents', pk: 'incident_id' },
    vendor: { table: 'vendors', pk: 'vendor_id' },
    framework: { table: 'frameworks', pk: 'framework_id' },
    evidence: { table: 'evidence', pk: 'evidence_id' },
    assessment: { table: 'assessments', pk: 'assessment_id' },
  };

  const cfg = tableConfig[entityType];
  let entityData: unknown = {};

  if (cfg) {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".${cfg.table} WHERE ${cfg.pk} = $1 LIMIT 1`,
        [entityId]
      );
      if (result.rows.length > 0) entityData = getFirstRow(result);
    } catch {
      // Entity not found, generate generic summary
    }
  }

  // Fetch related entity counts for richer context
  let relatedCounts: Record<string, number> = {};
  try {
    if (entityType === 'risk') {
      const evCount = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence WHERE control_id = ANY(
          SELECT control_id FROM "${schema}".controls WHERE $1 = ANY(risk_ids)
        )`, [entityId]
      ), { tenantId: tenantId, operation: 'query evidence' });
      relatedCounts.linkedEvidence = getFirstRow(evCount)?.cnt ?? 0;
    }
    if (entityType === 'control') {
      const evCount = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
        `SELECT COUNT(*)::int AS cnt FROM "${schema}".evidence WHERE control_id = $1`, [entityId]
      ), { tenantId: tenantId, operation: 'query evidence' });
      relatedCounts.evidenceCount = getFirstRow(evCount)?.cnt ?? 0;
    }
  } catch { /* non-critical enrichment */ }

  const entityJson = JSON.stringify({ ...entityData, relatedCounts }, null, 2);

  const promptEn = `Summarize this ${entityType} entity concisely. Include key risk indicators, compliance status, and actionable insights. Entity data:\n${entityJson}`;
  const __promptAr = `قم بتلخيص هذا الكيان من نوع ${entityType} بإيجاز. قم بتضمين مؤشرات المخاطر الرئيسية وحالة الامتثال والرؤى القابلة للتنفيذ. بيانات الكيان:\n${entityJson}`;

  let summaryEn = `Summary of ${entityType} ${entityId}`;
  let summaryAr = `ملخص ${entityType} ${entityId}`;
  let keyPoints: string[] = [];

  try {
    const aiResponse = await gatewayComplete({
      systemPrompt: `You are a GRC analyst for a Saudi Arabian organization. Provide concise entity summaries.
Respond in JSON format: { "summaryEn": "...", "summaryAr": "...", "keyPoints": ["point1", "point2", ...], "riskLevel": "critical|high|medium|low|info" }`,
      userMessage: promptEn,
      maxTokens: 800,
      tenantId,
    });

    try {
      const parsed = JSON.parse(aiResponse);
      summaryEn = parsed.summaryEn || summaryEn;
      summaryAr = parsed.summaryAr || summaryAr;
      keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [];
    } catch {
      summaryEn = aiResponse;
      summaryAr = aiResponse;
    }
  } catch {
    // Build structured fallback from entity data
    const title = entityData.title || entityData.name || entityId;
    const status = entityData.status || 'any';
    summaryEn = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}: ${title}. Status: ${status}.`;
    summaryAr = `${entityType}: ${title}. الحالة: ${status}.`;

    if (entityData.risk_score) keyPoints.push(`Risk score: ${entityData.risk_score}`);
    if (entityData.severity) keyPoints.push(`Severity: ${entityData.severity}`);
    if (entityData.score != null) keyPoints.push(`Score: ${entityData.score}%`);
    if (relatedCounts.evidenceCount != null) keyPoints.push(`Evidence items: ${relatedCounts.evidenceCount}`);
    if (entityData.owner || entityData.owner_id) keyPoints.push(`Owner: ${entityData.owner || entityData.owner_id}`);
  }

  // Derive risk level from entity data
  let riskLevel: string | undefined;
  if (entityData.risk_score) {
    const score = entityData.risk_score;
    riskLevel = score >= 20 ? 'critical' : score >= 12 ? 'high' : score >= 6 ? 'medium' : 'low';
  } else if (entityData.severity) {
    riskLevel = entityData.severity;
  }

  return {
    entityType,
    entityId,
    summary: language === 'ar' ? summaryAr : summaryEn,
    summaryAr,
    keyPoints,
    riskLevel,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Related Recommendations
// ============================================================================

/**
 * Get related recommendations based on entity links, evidence gaps,
 * and cross-entity analysis.
 * Requirements: 4.5
 */
export async function getRelatedRecommendations(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<AISuggestion[]> {
  const schema = tenantSchema(tenantId);
  const suggestions: AISuggestion[] = [];

  // Fetch links, evidence, and entity data in parallel
  const [linksResult, entityResult, evidenceResult] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT source_type, source_id, target_type, target_id, link_type FROM "${schema}".entity_links
       WHERE (source_type = $1 AND source_id = $2) OR (target_type = $1 AND target_id = $2)`,
      [entityType, entityId]
    ), { tenantId: tenantId, operation: 'query entity_links' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT * FROM "${schema}".${entityType === 'risk' ? 'risks' : entityType === 'control' ? 'controls' : entityType === 'policy' ? 'policies' : entityType === 'incident' ? 'incidents' : entityType === 'vendor' ? 'vendors' : 'controls'}
       WHERE ${entityType}_id = $1 LIMIT 1`,
      [entityId]
    ), { tenantId: tenantId, operation: 'fallback query' }),
    entityType === 'control'
      ? swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0, approved: 0 }]), query(`SELECT COUNT(*) as cnt, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved FROM "${schema}".evidence WHERE control_id = $1`, [entityId]), { tenantId: tenantId, operation: 'query evidence' })
      : Promise.resolve({ rows: [{ cnt: 0, approved: 0 }] }),
  ]);

  const links = linksResult.rows;
  const entity = getFirstRow(entityResult) || {};
  const evidenceCount = Number(getFirstRow(evidenceResult)?.cnt || 0);
  const approvedEvidence = Number(getFirstRow(evidenceResult)?.approved || 0);

  // Link-based recommendations
  if (links.length === 0) {
    suggestions.push({
      id: 'link-entities',
      text: `This ${entityType} has no linked entities. Link related risks, controls, or evidence for traceability.`,
      textAr: `هذا ${entityType} ليس لديه كيانات مرتبطة. اربط المخاطر والضوابط والأدلة ذات الصلة لتحقيق التتبع.`,
      type: 'recommendation',
      confidence: 0.85,
      reasoning: 'No entity links found — traceability gap',
      entityType,
      entityId,
    });
  } else {
    // Check for missing link types
    const __linkTypes = new Set(links.map((l: any) => l.link_type));
    const linkedEntityTypes = new Set(links.map((l: any) => l.source_type === entityType ? l.target_type : l.source_type));

    if (entityType === 'risk' && !linkedEntityTypes.has('control')) {
      suggestions.push({
        id: 'risk-no-controls',
        text: 'This risk has no linked controls — map mitigating controls',
        textAr: 'هذا الخطر ليس لديه ضوابط مرتبطة — قم بربط الضوابط المخففة',
        type: 'warning',
        confidence: 0.90,
        reasoning: 'Risk without linked controls lacks mitigation traceability',
        entityType,
        entityId,
      });
    }
    if (entityType === 'control' && !linkedEntityTypes.has('risk')) {
      suggestions.push({
        id: 'control-no-risks',
        text: 'This control is not linked to any risk — verify its purpose',
        textAr: 'هذا الضابط غير مرتبط بأي خطر — تحقق من الغرض منه',
        type: 'insight',
        confidence: 0.75,
        reasoning: 'Orphan control without risk linkage',
        entityType,
        entityId,
      });
    }
  }

  // Evidence-based recommendations for controls
  if (entityType === 'control') {
    if (evidenceCount === 0) {
      suggestions.push({
        id: 'control-no-evidence',
        text: 'No evidence attached — this control cannot pass audit without evidence',
        textAr: 'لا توجد أدلة مرفقة — لا يمكن لهذا الضابط اجتياز التدقيق بدون أدلة',
        type: 'warning',
        confidence: 0.95,
        reasoning: 'Control has zero evidence items',
        entityType,
        entityId,
      });
    } else if (approvedEvidence < evidenceCount) {
      const pending = evidenceCount - approvedEvidence;
      suggestions.push({
        id: 'control-pending-evidence',
        text: `${pending} evidence item(s) pending approval — review and approve`,
        textAr: `${pending} عنصر(عناصر) أدلة في انتظار الموافقة — راجع ووافق`,
        type: 'recommendation',
        confidence: 0.80,
        reasoning: `${pending} unapproved evidence items`,
        entityType,
        entityId,
      });
    }
  }

  // Status-based recommendations
  if (entity.status === 'draft' || entity.status === 'not_started') {
    suggestions.push({
      id: 'entity-draft',
      text: `This ${entityType} is still in draft — move it forward in the lifecycle`,
      textAr: `هذا ${entityType} لا يزال في المسودة — قم بتقدمه في دورة الحياة`,
      type: 'recommendation',
      confidence: 0.72,
      reasoning: 'Entity is in initial state',
      entityType,
      entityId,
    });
  }

  // Staleness check
  if (entity.updated_at) {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(entity.updated_at).getTime()) / 86400000);
    if (daysSinceUpdate > 180) {
      suggestions.push({
        id: 'entity-stale',
        text: `Not updated in ${daysSinceUpdate} days — review for continued relevance`,
        textAr: `لم يتم التحديث منذ ${daysSinceUpdate} يوماً — راجع مدى الملاءمة المستمرة`,
        type: 'insight',
        confidence: 0.78,
        reasoning: `Entity stale for ${daysSinceUpdate} days`,
        entityType,
        entityId,
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
