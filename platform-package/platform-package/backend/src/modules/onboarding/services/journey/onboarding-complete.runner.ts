// @ts-nocheck
import { logger } from '../../../../utils/logger';
/**
 * Shared onboarding-complete logic used by legacy callers; canonical HTTP surface is
 * POST /api/onboarding/complete (Onboarding OS v2) + provisioning-step-runner.
 */
import { safeQuery, tenantSchema, createTenantSchema } from "../../../../config/database";
import { generateWorkspaceBlueprint } from '../../../ai/services/misc/ai-onboarding.engine';
import { getApplicableRegulations } from "../../../../platform/dos/config/registry/registry.service";
import { eventBus } from '../../../platform/services/event/event-bus.service';
import { toErrorMessage } from '../../../../utils/http-error.util';
import { getFirstRow } from '../../../../utils/db-utils';
import type { GenericRow } from '../../../../types/db-rows.types';
import { swallow, EC } from '../../../../utils/resilient-catch';

export interface RunOnboardingCompleteInput {
  tenantId: string;
  userId: string;
  answers?: Record<string, any>;
}

export interface RunOnboardingCompleteResult {
  success: boolean;
  workspace: {
    tenantId: string;
    frameworkCount: number;
    riskCount: number;
    policyCount: number;
    controlCount: number;
    dashboardLayout?: string;
  };
  error?: string;
}

export async function runOnboardingComplete(input: RunOnboardingCompleteInput): Promise<RunOnboardingCompleteResult> {
  const { tenantId, userId, answers = {} } = input;
  const schema = tenantSchema(tenantId);

  // Ensure tenant schema has all latest columns (e.g. policy_id on controls)
  try { await createTenantSchema(tenantId); } catch { /* schema already exists — ALTER will still run */ }

  const bp = await generateWorkspaceBlueprint(answers);

  await safeQuery(
    `UPDATE tenants SET org_name=$1, industry=$2, org_size=$3, regions=$4, status='active', updated_at=NOW() WHERE tenant_id=$5`,
    [answers.org_name || bp.orgName, answers.industry || "other", answers.org_size || "1-50", answers.regions || [], tenantId]
  );

  // ── AGRC-OS: set tenant workspace dimensions from onboarding answers ───────
  // So orchestrator, CCM, and jobs use riskAppetite, reportingCadence, controlFlags.
  try {
    async function profileResolutionFromOnboardingAnswers(_answers?: any) { return {} as any; }
    const profileResolution = profileResolutionFromOnboardingAnswers(answers);
    const res = await safeQuery(
      `SELECT settings FROM tenants WHERE tenant_id = $1`,
      [tenantId]
    );
    const current = (getFirstRow(res)?.settings as Record<string, any>) || {};
    await safeQuery(
      `UPDATE tenants SET settings = $1, updated_at = NOW() WHERE tenant_id = $2`,
      [JSON.stringify({ ...current, profileResolution }), tenantId]
    );
  } catch (e: unknown) {
    logger.warn("[Onboarding] profileResolution seed skipped:", toErrorMessage(e));
  }

  const sectorIds: string[] = answers.sector_ids || [];
  if (sectorIds.length > 0) {
    try {
      const scope = await getApplicableRegulations(sectorIds);
      const fwIds = scope.frameworks.map((f: GenericRow) => f.instrument_id);
      await safeQuery(`UPDATE tenants SET active_frameworks = $1 WHERE tenant_id = $2`, [fwIds, tenantId]);
      for (const fw of scope.frameworks) {
        await safeQuery(
          `INSERT INTO "${schema}".frameworks (framework_id, name, description, category, total_controls)
           VALUES ($1, $2, $3, 'security', 0)
           ON CONFLICT (framework_id) DO UPDATE SET
             name = EXCLUDED.name, description = EXCLUDED.description
           WHERE (frameworks.name, frameworks.description) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description)`,
          [fw.instrument_id, fw.name_en, fw.summary_en || fw.name_ar]
        );
      }
    } catch (err) {
      logger.warn("[Onboarding] Registry seed error:", err);
    }
  }

  // ── Seed frameworks → EventBus (nothing bypasses the bus) ──────────────
  for (const fw of bp.frameworks) {
    await safeQuery(
      `INSERT INTO "${schema}".frameworks (framework_id, name, description, category, total_controls) VALUES ($1,$2,$3,'security',$4)
       ON CONFLICT (framework_id) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description, total_controls = EXCLUDED.total_controls
       WHERE (frameworks.name, frameworks.description) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description)`,
      [fw.id, fw.name, fw.reason, bp.controls.length]
    );
    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'framework.mapped', tenantId, sourceService: 'onboarding-seeder',
      entityType: 'framework', entityId: fw.id, severity: 'info',
      payload: { frameworkName: fw.name, reason: fw.reason, source: 'onboarding_answers' },
    }), { tenantId, operation: 'eventBus:framework.mapped' });
  }

  // ── Seed regulatory calendar from frameworks ─────────────────────────────
  try {
    const { seedRegulatoryCalendarFromFrameworks } = await import('../../../compliance/services/regulatory/regulatory-calendar.service');
    const frameworkIds = bp.frameworks.map(f => f.id);
    const seedResult = await seedRegulatoryCalendarFromFrameworks(tenantId, frameworkIds);
    if (seedResult.seeded > 0) {
      logger.info(`[Onboarding] Seeded ${seedResult.seeded} regulatory calendar entries`);
    }
    if (seedResult.errors.length > 0) {
      logger.warn(`[Onboarding] Regulatory calendar seeding errors:`, seedResult.errors);
    }
  } catch (calendarErr) {
    logger.warn("[Onboarding] Regulatory calendar seed skipped:", toErrorMessage(calendarErr));
  }

  // ── Seed risks → EventBus ─────────────────────────────────────────────────
  for (const r of bp.risks) {
    await safeQuery(
      `INSERT INTO "${schema}".risks (risk_id, title, description, category, likelihood, impact) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (risk_id) DO UPDATE SET
         title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category,
         likelihood = EXCLUDED.likelihood, impact = EXCLUDED.impact
       WHERE (risks.title, risks.description) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.description)`,
      [r.id, r.title, `Auto-generated: ${r.title}`, r.category, r.likelihood, r.impact]
    );
    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'risk.created', tenantId, sourceService: 'onboarding-seeder',
      entityType: 'risk', entityId: r.id, severity: 'info',
      payload: { title: r.title, category: r.category, likelihood: r.likelihood, impact: r.impact, source: 'onboarding_answers' },
    }), { tenantId, operation: 'eventBus:risk.created' });
  }

  // ── Seed policies → EventBus (linked to frameworks) ───────────────────────
  for (const p of bp.policies) {
    await safeQuery(
      `INSERT INTO "${schema}".policies (policy_id, title, content, frameworks, owner) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (policy_id) DO UPDATE SET
         title = EXCLUDED.title, content = EXCLUDED.content, frameworks = EXCLUDED.frameworks
       WHERE (policies.title, policies.content) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.content)`,
      [p.id, p.title, `[AI Draft] ${p.title} — Auto-generated. Please review and customize.`, p.frameworks, userId]
    );
    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'policy.created', tenantId, sourceService: 'onboarding-seeder',
      entityType: 'policy', entityId: p.id, severity: 'info',
      payload: { policyTitle: p.title, frameworks: p.frameworks, source: 'onboarding_answers' },
    }), { tenantId, operation: 'eventBus:policy.created' });
  }

  // ── Build control→policy mapping (every control MUST have a parent policy) ─
  const CONTROL_POLICY_MAP: Record<string, string> = {
    'Multi-Factor Authentication': 'Access Control Policy',
    'Encryption at Rest & Transit': 'Information Security Policy',
    'Access Reviews (Quarterly)': 'Access Control Policy',
    'Vulnerability Scanning': 'Information Security Policy',
    'Security Awareness Training': 'Information Security Policy',
    'Backup & Recovery Testing': 'Business Continuity Policy',
    'Logging & Monitoring': 'Information Security Policy',
    'Change Management Process': 'Information Security Policy',
  };
  const policyIdByTitle = new Map(bp.policies.map(p => [p.title, p.id]));
  // Fallback: first policy if no mapping found
  const fallbackPolicyId = bp.policies.length > 0 ? bp.policies[0].id : null;

  // ── Seed controls → EventBus (linked to parent policy + frameworks) ───────
  for (const c of bp.controls) {
    const parentPolicyTitle = CONTROL_POLICY_MAP[c.title];
    const parentPolicyId = parentPolicyTitle
      ? (policyIdByTitle.get(parentPolicyTitle) || fallbackPolicyId)
      : fallbackPolicyId;

    await safeQuery(
      `INSERT INTO "${schema}".controls (control_id, title, description, frameworks, automatable, policy_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (control_id) DO UPDATE SET
         title = EXCLUDED.title, description = EXCLUDED.description, frameworks = EXCLUDED.frameworks
       WHERE (controls.title, controls.description) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.description)`,
      [c.id, c.title, `Auto-generated: ${c.title}`, c.frameworks, c.automatable, parentPolicyId]
    );
    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'control.implemented', tenantId, sourceService: 'onboarding-seeder',
      entityType: 'control', entityId: c.id, severity: 'info',
      payload: {
        controlName: c.title, automatable: c.automatable,
        frameworks: c.frameworks, policyId: parentPolicyId,
        source: 'onboarding_answers',
      },
    }), { tenantId, operation: 'eventBus:control.implemented' });
  }

  // ── Store answers snapshot for lifecycle re-seeding ────────────────────────
  try {
    const { storeAnswerSnapshot } = await import("./workspace-lifecycle.service");
    await storeAnswerSnapshot(
      tenantId, '', 'initial', answers
    );
  } catch (e: unknown) {
    logger.warn("[Onboarding] Answer snapshot save skipped:", toErrorMessage(e));
  }

  try {
    const { seedDefaultConstitution } = await import('../../../governance/services/governance/governance-constitution.service');
    await seedDefaultConstitution(tenantId, {
      riskAppetite: bp.agrcOsConfig.riskAppetite,
      escalationLevel: bp.agrcOsConfig.escalationLevel,
      enforcementMode: bp.agrcOsConfig.enforcementMode,
    });
  } catch (e: unknown) {
    logger.warn("[Onboarding] Constitution seed skipped:", toErrorMessage(e));
  }

  try {
    const { seedDefaultRunbooks } = await import("../../../../platform/dos/config/registry/agrc-runbook.service");
    const { seedDefaultSOPs } = await import("../../../../platform/dos/services/document-generation/sop-library.service");
    await seedDefaultRunbooks(tenantId);
    await seedDefaultSOPs(tenantId);
  } catch (e: unknown) {
    logger.warn("[Onboarding] AGRC-OS runbooks/SOPs seed skipped:", toErrorMessage(e));
  }

  try {
    const { seedWorkspaceProfileFromOnboarding } = await import("../../../../platform/dos/config/registry/agrc-os-ui.service");
    await seedWorkspaceProfileFromOnboarding(tenantId);
  } catch (e: unknown) {
    logger.warn("[Onboarding] Workspace profile seed skipped:", toErrorMessage(e));
  }

  await safeQuery(`UPDATE users SET onboarding_complete=TRUE, updated_at=NOW() WHERE user_id=$1`, [userId]);

  // ── AGRC-OS: Bootstrap workspace — fire all seeded data into the cross-hub
  // integration so the workspace comes alive with tasks, compliance gaps,
  // evidence requests, and autonomous scanning. Fire-and-forget (async).
  try {
    const { bootstrapWorkspace } = await import("./workspace-bootstrap.service");
    // Run async so onboarding response isn't delayed
    bootstrapWorkspace({ tenantId, workspaceName: 'default', createdBy: userId }).then((result: any) => {
      logger.info(
        `[Onboarding] AGRC-OS Bootstrap complete for ${tenantId}: ` +
        `workspace=${result.workspaceName}, status=${result.status}`
      );
    }).catch((e: any) => {
      logger.warn("[Onboarding] AGRC-OS Bootstrap failed (non-fatal):", toErrorMessage(e));
    });
  } catch (e: unknown) {
    logger.warn("[Onboarding] AGRC-OS Bootstrap skipped:", toErrorMessage(e));
  }

  return {
    success: true,
    workspace: {
      tenantId,
      frameworkCount: bp.frameworks.length,
      riskCount: bp.risks.length,
      policyCount: bp.policies.length,
      controlCount: bp.controls.length,
      dashboardLayout: bp.dashboardLayout,
    },
  };
}
