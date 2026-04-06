/**
 * AGRC-OS UI Service — Bridges onboarding answers into the workspace profile.
 *
 * Called after onboarding completes to populate the workspace_profile table
 * with data gathered during the onboarding wizard (org size, sectors,
 * regulatory environment, maturity self-assessment, etc.).
 */

import { safeQuery, tenantSchema } from '../../../../config/database';
import { logger } from '../../observability/services/logger.service';

/**
 * Copy onboarding answers into the workspace profile for the tenant.
 * Reads from `onboarding_responses` and upserts into `workspace_profile`.
 */
export async function seedWorkspaceProfileFromOnboarding(
  tenantId: string,
): Promise<{ fieldsPopulated: number }> {
  const schema = tenantSchema(tenantId);
  let fieldsPopulated = 0;

  try {
    // Fetch completed onboarding responses
    const { rows: responses } = await safeQuery(
      `SELECT question_key, answer_value, answer_json
       FROM "${schema}".onboarding_responses
       WHERE status = 'completed'
       ORDER BY step_order ASC`,
    ).catch(() => ({ rows: [] }));

    if (responses.length === 0) {
      logger.info('[AgrcOsUi] No completed onboarding responses to seed', { tenantId });
      return { fieldsPopulated: 0 };
    }

    // Map onboarding question keys to workspace profile fields
    const profileMapping: Record<string, string> = {
      org_name: 'organization_name',
      org_size: 'organization_size',
      industry_sector: 'primary_sector',
      industry_sectors: 'sectors',
      regulatory_environment: 'regulatory_environment',
      maturity_self_assessment: 'self_assessed_maturity',
      primary_frameworks: 'applicable_frameworks',
      grc_goals: 'grc_objectives',
      team_size: 'grc_team_size',
      preferred_language: 'language',
      country: 'country',
      region: 'region',
      compliance_deadline: 'next_compliance_deadline',
      existing_tools: 'existing_tools',
    };

    // Build profile data from responses
    const profileData: Record<string, unknown> = {};
    for (const response of responses) {
      const key = response.question_key as string;
      const profileField = profileMapping[key];
      if (profileField) {
        // Prefer structured JSON answer over plain text
        profileData[profileField] = response.answer_json ?? response.answer_value;
        fieldsPopulated++;
      }
    }

    if (fieldsPopulated === 0) {
      return { fieldsPopulated: 0 };
    }

    // Check if workspace profile already exists
    const { rows: existing } = await safeQuery(
      `SELECT 1 FROM "${schema}".workspace_profile WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    if (existing.length > 0) {
      // Update existing profile
      await safeQuery(
        `UPDATE "${schema}".workspace_profile
         SET profile_data = COALESCE(profile_data, '{}'::jsonb) || $1::jsonb,
             onboarding_seeded = TRUE,
             updated_at = NOW()
         WHERE tenant_id = $2`,
        [JSON.stringify(profileData), tenantId],
      );
    } else {
      // Insert new profile
      await safeQuery(
        `INSERT INTO "${schema}".workspace_profile
           (tenant_id, profile_data, onboarding_seeded, created_at, updated_at)
         VALUES ($1, $2, TRUE, NOW(), NOW())`,
        [tenantId, JSON.stringify(profileData)],
      );
    }

    logger.info('[AgrcOsUi] Workspace profile seeded from onboarding', {
      tenantId,
      fieldsPopulated,
      fields: Object.keys(profileData),
    });

    return { fieldsPopulated };
  } catch (err) {
    logger.error('[AgrcOsUi] Failed to seed workspace profile', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { fieldsPopulated: 0 };
  }
}
