// @ts-nocheck
import { emptyResult, query, safeQuery } from '../../../config/database/database';
import { TenantEntitlements } from '../provisioning/types';
import { computeDegradation } from '../services/subscription-lifecycle/index';
import type { GenericRow } from '../../../types/db-rows.types';
import { swallowDefault, EC } from '../../../platform/dos/resilience/resilient-catch';
import { getDefaultProductKey } from '../../../platform/deployment-profile';

export class TenantEntitlementsResolver {
  async resolve(tenantId: string): Promise<TenantEntitlements> {
    const subRes = await query(
      `SELECT tier, status, trial_ends_at FROM public.subscriptions WHERE tenant_id = $1`,
      [tenantId]
    );

    const sub = subRes.rows[0];
    const tier = sub?.tier ?? 'starter';
    const subStatus = sub?.status ?? 'trialing';

    // Get tier features — features is TEXT[] in tier_definitions
    const tierRes = await query(
      `SELECT features, limits FROM public.tier_definitions WHERE tier = $1`,
      [tier]
    );
    const tierRow = tierRes.rows[0];
    const tierFeatures: string[] = Array.isArray(tierRow?.features) ? tierRow.features : [];
    const tierLimits: Record<string, number> = tierRow?.limits ?? {};

    // Get edition limits — separate flat columns
    const editionRes = await query(
      `SELECT max_users, max_frameworks, max_assessments, features FROM public.edition_limits WHERE plan = $1`,
      [tier]
    );
    const editionRow = editionRes.rows[0];
    const editionFeatures: Record<string, boolean> = editionRow?.features ?? {};

    // Module entitlements (per-tenant licensing override)
    const entitlementRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT grc_enabled, qiyas_enabled, licensed_modules, default_operation_mode, agent_confidence_threshold
       FROM public.tenant_module_entitlements WHERE tenant_id = $1`,
      [tenantId]
    ), { tenantId: tenantId, operation: 'fallback query' });
    const entRow = entitlementRes.rows[0];
    const tenantQiyasEnabled: boolean = entRow ? !!entRow.qiyas_enabled : false;
    const tenantGrcEnabled: boolean = entRow ? !!entRow.grc_enabled : true;
    const defaultOpMode: string = entRow?.default_operation_mode ?? 'human_only';
    const agentConfidenceThreshold: number = entRow?.agent_confidence_threshold ?? 0.85;

    // Licensed modules list
    const licensedModules: string[] = Array.isArray(entRow?.licensed_modules) ? entRow.licensed_modules : [];

    // Granular module details from module_workflow_registry
    const moduleDetailMap: Record<string, { enabled: boolean; licensed: boolean; tierGate: string | null; kickstartStatus: string }> = {};
    try {
      const mwrRes = await query(
        `SELECT module_code, licensed, tier_gate, kickstart_status
         FROM "${`tenant_${tenantId}`}".module_workflow_registry`
      );
      for (const row of mwrRes.rows) {
        const isLicensed = licensedModules.length === 0 || licensedModules.includes(row.module_code);
        moduleDetailMap[row.module_code] = {
          enabled: row.licensed !== false && isLicensed,
          licensed: isLicensed,
          tierGate: row.tier_gate || null,
          kickstartStatus: row.kickstart_status || 'not_started',
        };
      }
    } catch {
      // module_workflow_registry may not exist yet
    }

    // Installed packs
    const packRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT pack_id FROM "${`tenant_${tenantId}`}".content_pack_installations WHERE status = 'active'`
    ), { tenantId: tenantId, operation: 'query content_pack_installations' });
    const installedPackIds = packRes.rows.map((r: Record<string, any>) => r.pack_id as string);

    const hasFeature = (key: string): boolean =>
      tierFeatures.includes(key) || editionFeatures[key] === true;

    const degradation = computeDegradation(subStatus);

    let moduleOperatingStates: TenantEntitlements['moduleOperatingStates'] = undefined;
    try {
      const osResult = await safeQuery(
        `SELECT module_code, state, activation_source, trial_expiry_at, is_mandatory
         FROM public.module_operating_states
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY priority, module_code`,
        [tenantId]
      );
      if (osResult.rows.length > 0) {
        moduleOperatingStates = osResult.rows.map((r: GenericRow) => ({
          moduleCode: r.module_code,
          state: r.state,
          activationSource: r.activation_source,
          trialExpiryAt: r.trial_expiry_at,
          isMandatory: !!r.is_mandatory,
        }));
      }
    } catch { /* table may not exist yet */ }

    return {
      tenantId,
      subscription: {
        tier,
        status: subStatus as TenantEntitlements['subscription']['status'],
        trialEndsAt: sub?.trial_ends_at ?? null,
      },
      degradation: {
        active: degradation.active,
        reason: degradation.reason,
        mode: degradation.mode,
        allowedRead: degradation.allowedRead,
        allowedWrite: degradation.allowedWrite,
        allowedAdminBillingOnly: degradation.allowedAdminBillingOnly,
        warnings: degradation.warnings,
      },
      operationMode: {
        defaultMode: defaultOpMode,
        agentConfidenceThreshold,
      },
      modules: {
        agrc: tenantGrcEnabled && (hasFeature(getDefaultProductKey()) || tierFeatures.includes('governance')),
        qiyas: tenantQiyasEnabled && hasFeature('qiyas'),
        dataGovernance: hasFeature('data_governance') || hasFeature('privacy_ops'),
        privacyOps: hasFeature('privacy_ops'),
        vendorGovernance: hasFeature('vendor_automation') || hasFeature('vendors'),
        projectGovernance: hasFeature('projects'),
        connectorCenter: hasFeature('connectors') || hasFeature('connector_center'),
        aiCopilot: hasFeature('ai_copilot'),
      },
      limits: {
        maxUsers: editionRow?.max_users ?? tierLimits['max_users'] ?? 10,
        maxFrameworks: editionRow?.max_frameworks ?? tierLimits['max_frameworks'] ?? 5,
        maxAssessments: editionRow?.max_assessments ?? tierLimits['max_assessments'] ?? 20,
        maxDashboards: tierLimits['max_dashboards'] ?? 10,
        maxConnectors: tierLimits['max_connectors'] ?? 3,
      },
      connectors: {
        siem:        hasFeature('connectors') || hasFeature('connector_siem'),
        iam:         hasFeature('connectors') || hasFeature('connector_iam'),
        cmdb:        hasFeature('connectors') || hasFeature('connector_cmdb'),
        itsm:        hasFeature('connectors') || hasFeature('connector_itsm'),
        m365:        hasFeature('connectors') || hasFeature('connector_m365'),
        vulnScanner: hasFeature('connectors') || hasFeature('connector_vuln_scanner'),
      },
      features: {
        advancedScoring:      hasFeature('risk_scoring_advanced'),
        qiyasBenchmarking:    hasFeature('qiyas') && hasFeature('qiyas_benchmarking'),
        qiyasCertification:   hasFeature('qiyas') && hasFeature('qiyas_certification'),
        workflowDesigner:     hasFeature('workflow_templates'),
        executiveNarratives:  hasFeature('board_view') || hasFeature('ai_copilot'),
        packInstaller:        installedPackIds.length > 0 || hasFeature('content_packs_custom'),
      },
      moduleDetails: moduleDetailMap,
      licensedModules,
      ui: {
        visibleModules: [
          hasFeature(getDefaultProductKey()) || tierFeatures.includes('governance') ? getDefaultProductKey() : null,
          hasFeature('qiyas') ? 'qiyas' : null,
          hasFeature('data_governance') || hasFeature('privacy_ops') ? 'data-governance' : null,
          hasFeature('privacy_ops') ? 'privacy' : null,
          hasFeature('connectors') ? 'connectors' : null,
        ].filter(Boolean) as string[],
        homeRouteByRole: {
          executive_owner:     '/executive/overview',
          grc_manager:         '/governance/overview',
          audit_manager:       '/audit/mission-board',
          risk_manager:        '/risk/register',
          compliance_lead:     '/compliance/overview',
          data_governance_lead: '/data-governance/overview',
          tenant_admin:        '/dashboard',
          admin:               '/dashboard',
        },
      },
      moduleOperatingStates,
    };
  }
}
