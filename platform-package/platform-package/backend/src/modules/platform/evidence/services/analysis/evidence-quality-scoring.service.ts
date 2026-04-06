/**
 * Evidence Quality Scoring Service
 * --------------------------------
 * Batch-scores evidence items on four dimensions:
 *   1. Completeness  — has file attachment, description, collected date
 *   2. Freshness     — age < 90 days from collection date
 *   3. Relevance     — linked to at least one control
 *   4. Attestation   — has an approver / sign-off recorded
 *
 * Each dimension contributes 25 points to a 0–100 composite score.
 * Items below the configurable threshold (default 50) are flagged.
 */

import { v4 as uuid } from 'uuid';
import { safeQuery } from '../../../../../config/database';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function schema(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

const QUALITY_THRESHOLD = 50;
const FRESHNESS_MAX_DAYS = 90;

interface EvidenceRow {
  id: string;
  file_url: string | null;
  description: string | null;
  collected_at: string | null;
  approved_by: string | null;
  control_link_count: number;
}

/**
 * Compute a 0–100 quality score for a single evidence row.
 */
function computeScore(row: EvidenceRow): { score: number; breakdown: Record<string, number> } {
  let completeness = 0;
  let freshness = 0;
  let relevance = 0;
  let attestation = 0;

  // --- Completeness (0–25) ---
  // file present: +10, description present: +10, collected date present: +5
  if (row.file_url) completeness += 10;
  if (row.description && row.description.trim().length > 0) completeness += 10;
  if (row.collected_at) completeness += 5;

  // --- Freshness (0–25) ---
  if (row.collected_at) {
    const ageDays = Math.floor(
      (Date.now() - new Date(row.collected_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (ageDays <= FRESHNESS_MAX_DAYS) {
      // Linear scale: 0 days → 25, 90 days → 0
      freshness = Math.max(0, Math.round(25 * (1 - ageDays / FRESHNESS_MAX_DAYS)));
    }
    // Older than 90 days → 0
  }

  // --- Relevance (0–25) ---
  // At least one control link: full marks. Zero links: 0.
  if (row.control_link_count > 0) {
    relevance = 25;
  }

  // --- Attestation (0–25) ---
  if (row.approved_by) {
    attestation = 25;
  }

  const score = completeness + freshness + relevance + attestation;
  return {
    score,
    breakdown: { completeness, freshness, relevance, attestation },
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Batch-score all evidence items that have not been scored recently
 * (or have never been scored).
 *
 * Returns aggregate statistics.
 */
export async function batchScoreEvidenceQuality(
  tenantId: string,
): Promise<{ scored: number; averageScore: number; belowThreshold: number }> {
  const s = schema(tenantId);

  // Fetch evidence items that need scoring:
  //   - no quality score yet, OR
  //   - last scored more than 24h ago
  const evidenceResult = await safeQuery(
    `SELECT
        ei.id,
        ei.file_url,
        ei.description,
        ei.collected_at,
        ei.approved_by,
        COALESCE(
          (SELECT COUNT(*)::int FROM "${s}".evidence_control_links ecl WHERE ecl.evidence_id = ei.id),
          0
        ) AS control_link_count
     FROM "${s}".evidence_items ei
    WHERE ei.evidence_quality_score IS NULL
       OR ei.quality_scored_at IS NULL
       OR ei.quality_scored_at < NOW() - INTERVAL '24 hours'
    ORDER BY ei.created_at DESC`,
  );

  if (!evidenceResult.rows || evidenceResult.rows.length === 0) {
    return { scored: 0, averageScore: 0, belowThreshold: 0 };
  }

  let totalScore = 0;
  let belowThreshold = 0;
  let scored = 0;

  for (const row of evidenceResult.rows) {
    const { score, breakdown } = computeScore(row as EvidenceRow);

    // Persist the score back to the evidence item
    await safeQuery(
      `UPDATE "${s}".evidence_items
          SET evidence_quality_score = $1,
              quality_scored_at      = NOW(),
              quality_breakdown      = $2,
              updated_at             = NOW()
        WHERE id = $3`,
      [score, JSON.stringify(breakdown), row.id],
    );

    totalScore += score;
    if (score < QUALITY_THRESHOLD) belowThreshold++;
    scored++;
  }

  const averageScore = scored > 0 ? Math.round(totalScore / scored) : 0;

  // Log a summary record for audit / dashboards
  await safeQuery(
    `INSERT INTO "${s}".evidence_quality_runs
       (id, run_at, items_scored, average_score, below_threshold)
     VALUES ($1, NOW(), $2, $3, $4)`,
    [uuid(), scored, averageScore, belowThreshold],
  );

  return { scored, averageScore, belowThreshold };
}
