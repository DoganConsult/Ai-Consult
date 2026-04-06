// @ts-nocheck
// ============================================================================
// Incremental Re-Resolution Service (Issue 12)
// When a tenant adds a new business unit in a different sector,
// extends their regulatory profile without full re-provisioning.
// ============================================================================

import { emptyResult, query, safeQuery } from "../../../../config/database";
import { resolveRegulatoryProfile, resolveRegulatoryProfileForTenant } from '../../../../modules/compliance/services/regulatory/regulatory-resolution.service';
import { eventBus } from '../../../../modules/platform/services/event/event-bus.service';
import { getFirstRow } from '../../../../utils/db-utils';
import { swallowDefault, EC } from '../../../../utils/resilient-catch';

/**
 * Add a new sector to a tenant and incrementally resolve additional
 * frameworks, controls, and risks without re-provisioning.
 */
export async function addSectorToTenant(
  tenantId: string,
  sectorCode: string,
  addedBy?: string
): Promise<{
  newAuthorities: number;
  newFrameworks: number;
  newControlCount: number;
  newEvidenceCount: number;
}> {
  const schema = `tenant_${tenantId.replace(/-/g, "_")}`;

  // 1. Record the new sector
  await query(
    `INSERT INTO public.tenant_sectors (tenant_id, sector_code, is_primary, added_by)
     VALUES ($1, $2, FALSE, $3)
     ON CONFLICT (tenant_id, sector_code) DO NOTHING`,
    [tenantId, sectorCode, addedBy ?? null]
  );

  // 2. Get current tenant resolution (all sectors)
  const currentProfile = await resolveRegulatoryProfileForTenant(tenantId);

  // 3. Get resolution for the new sector only
  const newSectorProfile = await resolveRegulatoryProfile(sectorCode);

  // 4. Find net-new frameworks (not already in tenant)
  const existingFrameworkCodes = new Set(currentProfile.frameworks.map((f) => f.code));
  const newFrameworks = newSectorProfile.frameworks.filter(
    (f) => !existingFrameworkCodes.has(f.code)
  );

  if (newFrameworks.length === 0) {
    return { newAuthorities: 0, newFrameworks: 0, newControlCount: 0, newEvidenceCount: 0 };
  }

  const newFwCodes = newFrameworks.map((f) => f.code);

  // 5. Seed new frameworks into tenant workspace
  for (const fw of newFrameworks) {
    await safeQuery(
      `INSERT INTO "${schema}".frameworks
        (framework_code, framework_name, version, status, source)
       VALUES ($1, $2, $3, 'active', 'incremental_resolution')
       ON CONFLICT DO NOTHING`,
      [fw.code, fw.name, fw.version]
    );
  }

  // 6. Seed new controls from regulatory_controls
  const ctrlRes = await safeQuery(
    `SELECT rc.control_code, rc.control_title_en, rc.control_description_en,
            rc.criticality_level, rc.automation_possible, cd.framework_code
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = ANY($1)`,
    [newFwCodes]
  );

  let newControlCount = 0;
  for (const ctrl of ctrlRes.rows) {
    await safeQuery(
      `INSERT INTO "${schema}".controls
        (control_id, control_name, description, framework_code,
         criticality, automatable, status, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', 'incremental_resolution')
       ON CONFLICT DO NOTHING`,
      [
        ctrl.control_code,
        ctrl.control_title_en,
        ctrl.control_description_en,
        ctrl.framework_code,
        ctrl.criticality_level,
        ctrl.automation_possible,
      ]
    );
    newControlCount++;
  }

  // 7. Seed new evidence tasks
  // Note: Evidence requirements should already be in tenant schema from initial provisioning
  // If not present, they need to be seeded first (handled separately if needed)
  const evRes = await safeQuery(
    `SELECT cd.framework_code, rc.control_code, cer.requirement_id, cer.required_cadence
     FROM "${schema}".control_evidence_requirements cer
     JOIN public.regulatory_controls rc ON rc.control_code = cer.control_id
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = ANY($1)`,
    [newFwCodes]
  );

  let newEvidenceCount = 0;
  // Get workspace_id for this tenant (assuming first workspace or a default)
  const workspaceRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT workspace_id FROM "${schema}".workspaces WHERE tenant_id = $1 LIMIT 1`,
    [tenantId]
  ), { tenantId: tenantId, operation: 'query control_evidence_requirements' });
  const workspaceId = getFirstRow(workspaceRes)?.workspace_id || tenantId; // Fallback to tenantId if no workspace

  for (const ev of evRes.rows) {
    await safeQuery(
      `INSERT INTO "${schema}".evidence_tasks
        (tenant_id, control_id, evidence_requirement_id, cadence, status, workspace_id, due_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW() + INTERVAL '90 days')
       ON CONFLICT DO NOTHING`,
      [
        tenantId,
        `${ev.framework_code}::${ev.control_code}`,
        ev.requirement_id,
        ev.required_cadence || 'quarterly',
        workspaceId,
      ]
    );
    newEvidenceCount++;
  }

  // 8. Seed new risks
  const existingRiskTitles = new Set(currentProfile.risks.map((r) => r.risk_title_en));
  const newRisks = newSectorProfile.risks.filter(
    (r) => !existingRiskTitles.has(r.risk_title_en)
  );

  for (const risk of newRisks) {
    await safeQuery(
      `INSERT INTO "${schema}".risks
        (risk_name, risk_category, impact, likelihood, status, source)
       VALUES ($1, $2, $3, $4, 'open', 'incremental_resolution')
       ON CONFLICT DO NOTHING`,
      [risk.risk_title_en, risk.risk_category, risk.sector_impact, risk.sector_likelihood]
    );
  }

  // 9. Find net-new authorities
  const existingAuthCodes = new Set(currentProfile.authorities.map((a) => a.code));
  const newAuthorities = newSectorProfile.authorities.filter(
    (a) => !existingAuthCodes.has(a.code)
  ).length;

  eventBus.publish({
    eventType: "regulatory.sector_added",
    tenantId,
    sourceService: "IncrementalResolution",
    severity: "info",
    payload: {
      sectorCode,
      newFrameworks: newFrameworks.length,
      newControlCount,
      newEvidenceCount,
      newAuthorities,
    },
  });

  return {
    newAuthorities,
    newFrameworks: newFrameworks.length,
    newControlCount,
    newEvidenceCount,
  };
}

/**
 * Remove a sector from a tenant (does not delete controls — marks for review).
 */
export async function removeSectorFromTenant(
  tenantId: string,
  sectorCode: string
): Promise<void> {
  await query(
    `DELETE FROM public.tenant_sectors
     WHERE tenant_id = $1 AND sector_code = $2 AND is_primary = FALSE`,
    [tenantId, sectorCode]
  );

  eventBus.publish({
    eventType: "regulatory.sector_removed",
    tenantId,
    sourceService: "IncrementalResolution",
    severity: "info",
    payload: { sectorCode },
  });
}
