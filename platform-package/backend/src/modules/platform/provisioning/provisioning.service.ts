// @ts-nocheck
import { emptyResult, query } from '../../../config/database/database';
import { ProvisioningOrchestrator } from './provisioning-orchestrator';
import { PackInstallerRegistry } from './pack-installer-registry';
import { PackManifest, ProvisioningContext } from './types';
import { resolvePacksForTier } from '../../../platform/dos/services/content-packs/pack-resolver.service';
import type { ContentPackManifest } from '../../../types/grc-os.types';
import { swallowDefault, EC } from '../../../platform/dos/resilience/resilient-catch';
import { getDefaultProductKey } from '../../../platform/deployment-profile';

export class ProvisioningService {
  private _orchestrator: any;

  private get orchestrator() {
    if (!this._orchestrator) {
      const { ProvisioningOrchestrator } = require('./provisioning-orchestrator');
      const { PackInstallerRegistry } = require('./pack-installer-registry');
      const registry = new PackInstallerRegistry();
      this._orchestrator = new ProvisioningOrchestrator(registry.getInstallers());
    }
    return this._orchestrator;
  }

  constructor() {}

  async startProvisioning(input: {
    tenantId: string;
    tenantSlug: string;
    actorUserId: string;
    sessionId?: string;
    locale?: 'en' | 'ar';
  }) {
    const locale = input.locale ?? 'en';

    // Resolve tenant
    const tenantResult = await query(
      `SELECT tenant_id, tenant_code, schema_name, status FROM public.tenants WHERE tenant_id = $1`,
      [input.tenantId]
    );
    const tenant = tenantResult.rows[0];
    if (!tenant) throw new Error(`Tenant not found: ${input.tenantId}`);

    // Resolve subscription (tenant_id is VARCHAR, no ::uuid)
    const subResult = await query(
      `SELECT tier, status FROM public.subscriptions WHERE tenant_id = $1`,
      [input.tenantId]
    );
    const subscription = subResult.rows[0];
    if (!subscription) throw new Error(`Subscription not found for tenant ${input.tenantId}`);

    // Resolve onboarding recommendation if session exists
    let recommendation: unknown = null;
    if (input.sessionId) {
      const recoResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
        `SELECT recommendation_type, recommendation_code, payload_json
         FROM public.onboarding_recommendations
         WHERE session_id = $1::uuid AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [input.sessionId]
      ), { operation: 'fallback query' });
      recommendation = recoResult.rows[0] ?? null;
    }

    // Resolve pack manifests
    const manifestBundle = await this.resolvePackManifests(subscription.tier);

    // Find or require a session_id for the FK constraint
    let sessionId = input.sessionId;
    if (!sessionId) {
      const sessResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
        `SELECT id FROM public.onboarding_sessions WHERE started_by_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [input.actorUserId]
      ), { operation: 'fallback query' });
      sessionId = sessResult.rows[0]?.id;
    }
    if (!sessionId) throw new Error('No onboarding session found — provisioning requires a session');

    // Create provisioning job (matches real table: id, session_id, tenant_id, job_status, requested_by_user_id, summary_json)
    const jobResult = await query(
      `INSERT INTO public.provisioning_jobs (session_id, tenant_id, job_status, requested_by_user_id, summary_json)
       VALUES ($1::uuid, $2::uuid, 'queued', $3, $4::jsonb)
       RETURNING id`,
      [sessionId, input.tenantId, input.actorUserId, JSON.stringify(recommendation?.payload_json ?? {})]
    );
    const jobId = jobResult.rows[0].id as string;

    // Build provisioning context
    const resolvedModules = this.resolveEnabledModules(recommendation, manifestBundle);
    const filteredModules = await this.applyLicensedModulesFilter(input.tenantId, resolvedModules);

    const ctx: ProvisioningContext = {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      schemaName: tenant.schema_name || `tenant_${input.tenantId}`,
      actorUserId: input.actorUserId,
      locale,
      subscriptionTier: subscription.tier,
      enabledModules: filteredModules,
      packKeys: manifestBundle.map((m) => m.pack_key),
      manifestBundle,
      recommendation,
      workspaceSeed: recommendation?.payload_json ?? null,
      provisioningJobId: jobId,
      productKey: tenant.product_key || getDefaultProductKey(),
    };

    // Mark tenant as provisioning
    await query(
      `UPDATE public.tenants SET status = 'provisioning', updated_at = now() WHERE tenant_id = $1`,
      [input.tenantId]
    );

    // Fire and forget — move to queue/worker later
    void this.orchestrator.run(ctx);

    return { jobId, tenantId: input.tenantId, status: 'queued' };
  }

  async getProvisioningStatus(jobId: string) {
    const jobResult = await query(
      `SELECT * FROM public.provisioning_jobs WHERE id = $1::uuid`,
      [jobId]
    );
    const job = jobResult.rows[0];
    if (!job) throw new Error(`Provisioning job not found: ${jobId}`);

    const stepsResult = await query(
      `SELECT * FROM public.provisioning_steps WHERE job_id = $1::uuid ORDER BY sequence_no ASC, created_at ASC`,
      [jobId]
    );

    const eventsResult = await query(
      `SELECT * FROM public.provisioning_events WHERE job_id = $1::uuid ORDER BY created_at ASC`,
      [jobId]
    );

    return { job, steps: stepsResult.rows, events: eventsResult.rows };
  }

  async getProvisioningSteps(jobId: string) {
    const result = await query(
      `SELECT * FROM public.provisioning_steps WHERE job_id = $1::uuid ORDER BY sequence_no ASC`,
      [jobId]
    );
    return result.rows;
  }

  async getProvisioningEvents(jobId: string) {
    const result = await query(
      `SELECT * FROM public.provisioning_events WHERE job_id = $1::uuid ORDER BY created_at ASC`,
      [jobId]
    );
    return result.rows;
  }

  private async resolvePackManifests(subscriptionTier: string): Promise<PackManifest[]> {
    // Load built-in JSON packs based on tier
    const builtIn: ContentPackManifest[] = await resolvePacksForTier(subscriptionTier);

    // Convert ContentPackManifest → PackManifest (internal provisioning format)
    const selected: PackManifest[] = builtIn.map((cp) => ({
      pack_key: cp.packId,
      pack_name: cp.packId.replace(/_/g, ' '),
      version: cp.version,
      pack_type: 'content',
      description: cp.metadata?.changelog,
      modules: cp.modules as Record<string, boolean | string[]> | undefined,
      role_pack: cp.role_pack ? {
        seed_roles: cp.role_pack.roles.map(r => r.code),
        default_assignments: cp.role_pack.roles.map(r => ({ code: r.code, name_en: r.name_en, name_ar: r.name_ar, permissions: r.permissions })),
      } : undefined,
      dashboard_pack: cp.dashboard_pack ? {
        layouts: cp.dashboard_pack.layouts.map(l => l.code),
        default_home_by_role: Object.fromEntries(
          cp.dashboard_pack.layouts.filter(l => l.role_code).map(l => [l.role_code!, '/' + l.code])
        ),
      } : undefined,
      workflow_pack: cp.workflow_pack ? {
        templates: cp.workflow_pack.templates.map(t => t.code),
      } : undefined,
      content_pack_refs: cp.frameworkRefs,
    }));

    // Also load any DB-stored packs not already included
    try {
      const packResult = await query(
        `SELECT pack_id, manifest FROM public.content_packs WHERE manifest IS NOT NULL`
      );
      for (const row of packResult.rows) {
        const manifest = typeof row.manifest === 'string' ? JSON.parse(row.manifest) : row.manifest;
        const key = manifest?.pack_key || manifest?.packId;
        if (key && !selected.find(s => s.pack_key === key)) {
          selected.push({
            pack_key: key,
            pack_name: key.replace(/_/g, ' '),
            version: manifest.version || '1.0.0',
            pack_type: 'content',
            modules: manifest.modules,
          });
        }
      }
    } catch { /* content_packs table may not exist */ }

    const { getProductManifests } = require('./product-bootstrap-hooks');
    for (const pm of getProductManifests()) {
      if (!selected.find(s => s.pack_key === pm.pack_key)) {
        selected.push(pm);
      }
    }

    return selected;
  }

  private resolveEnabledModules(recommendation: any, manifests: PackManifest[], _tenantId?: string): string[] {
    const fromReco: string[] = [];
    if (recommendation?.payload_json?.enabledModules) {
      fromReco.push(...recommendation.payload_json.enabledModules);
    }

    const fromManifest = manifests.flatMap((m) =>
      Object.entries(m.modules ?? {})
        .filter(([, v]) => v === true)
        .map(([k]) => k)
    );

    const { getDefaultProductModules } = require('./product-bootstrap-hooks');
    let enabledModules = [...new Set([...fromReco, ...fromManifest, ...getDefaultProductModules()])];

    // This method is called synchronously, but licensed_modules gating
    // is applied asynchronously in applyLicensedModulesFilter() after context creation.
    return enabledModules;
  }

  /**
   * Filter enabled modules by tenant's licensed_modules from tenant_module_entitlements.
   * Always-on modules (admin, workflow, notification, foundation) bypass the filter.
   */
  async applyLicensedModulesFilter(tenantId: string, enabledModules: string[]): Promise<string[]> {
    const ALWAYS_ON = new Set(['admin', 'workflow', 'notification', 'foundation', 'workspace']);
    try {
      const entitlementRow = await query(
        'SELECT licensed_modules FROM public.tenant_module_entitlements WHERE tenant_id = $1',
        [tenantId]
      );
      if (entitlementRow.rows.length > 0 && entitlementRow.rows[0].licensed_modules?.length > 0) {
        const licensed = new Set(entitlementRow.rows[0].licensed_modules as string[]);
        return enabledModules.filter(m => licensed.has(m) || ALWAYS_ON.has(m));
      }
    } catch {
      // Table may not exist yet — no filtering
    }
    return enabledModules;
  }
}
