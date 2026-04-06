import { catchHandler, EC } from '../../../../../platform/dos/resilience/resilient-catch';
import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';

/**
 * Seeds default RACI assignment templates for enabled modules.
 * These are module-level defaults (entity_id = NULL) that serve as templates
 * when new entities are created.
 */

const RACI_DEFAULTS: Record<string, Array<{
  entityType: string;
  roleR: string;
  roleA: string;
  roleC: string;
  roleI: string;
}>> = {
  risk: [
    { entityType: 'risk', roleR: 'risk_manager', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
    { entityType: 'risk_assessment', roleR: 'risk_manager', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  compliance: [
    { entityType: 'control', roleR: 'compliance_officer', roleA: 'admin', roleC: 'risk_manager', roleI: 'admin' },
    { entityType: 'framework', roleR: 'compliance_officer', roleA: 'admin', roleC: 'admin', roleI: 'auditor' },
  ],
  policy: [
    { entityType: 'policy', roleR: 'compliance_officer', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  evidence: [
    { entityType: 'evidence', roleR: 'compliance_officer', roleA: 'admin', roleC: 'compliance_officer', roleI: 'auditor' },
  ],
  audit: [
    { entityType: 'audit', roleR: 'auditor', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
  ],
  incident: [
    { entityType: 'incident', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  vendor: [
    { entityType: 'vendor', roleR: 'admin', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
  ],
  bcp: [
    { entityType: 'bcp_plan', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  asset: [
    { entityType: 'asset', roleR: 'admin', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
  ],
  remediation: [
    { entityType: 'remediation', roleR: 'manager', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
  ],
  action: [
    { entityType: 'action', roleR: 'manager', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  exception: [
    { entityType: 'exception', roleR: 'compliance_officer', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  governance: [
    { entityType: 'governance', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  training: [
    { entityType: 'training', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  qiyas: [
    { entityType: 'qiyas', roleR: 'analyst', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
  ],
  'ai-governance': [
    { entityType: 'ai-governance', roleR: 'risk_manager', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
  ],
  issues: [
    { entityType: 'issues', roleR: 'manager', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
  ],
  portals: [
    { entityType: 'portals', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  records: [
    { entityType: 'records', roleR: 'manager', roleA: 'admin', roleC: 'compliance_officer', roleI: 'admin' },
  ],
  privacy: [
    { entityType: 'privacy', roleR: 'compliance_officer', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  foundation: [
    { entityType: 'foundation', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  reporting: [
    { entityType: 'reporting', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  ai: [
    { entityType: 'ai', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  integrations: [
    { entityType: 'integrations', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  admin: [
    { entityType: 'admin', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  workflow: [
    { entityType: 'workflow', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  notification: [
    { entityType: 'notification', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  analytics: [
    { entityType: 'analytics', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
  team: [
    { entityType: 'team', roleR: 'admin', roleA: 'admin', roleC: 'admin', roleI: 'admin' },
  ],
};

export class RaciSeedInstaller implements SeedInstaller {
  key = 'install_raci_defaults';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async validate(ctx: ProvisioningContext): Promise<ValidationResult> {
    const warnings: string[] = [];
    try {
      const result = await query(
        `SET search_path TO "${ctx.schemaName}", public; SELECT COUNT(*) as cnt FROM grc_raci_assignments WHERE is_default = true`
      );
      const count = parseInt(result.rows[0]?.cnt || '0', 10);
      if (count < 1) {
        warnings.push('No default RACI templates found');
      }
    } catch {
      // grc_raci_assignments may not exist
    }
    return { valid: true, errors: [], warnings };
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const { schemaName, enabledModules } = ctx;
    let created = 0;
    const warnings: string[] = [];

    for (const moduleCode of enabledModules) {
      const mappings = RACI_DEFAULTS[moduleCode];
      if (!mappings) continue;

      for (const m of mappings) {
        try {
          // Insert 4 RACI assignments per entity type (R, A, C, I)
          const assignments = [
            { roleCode: m.roleR, assignmentType: 'responsible' },
            { roleCode: m.roleA, assignmentType: 'accountable' },
            { roleCode: m.roleC, assignmentType: 'consulted' },
            { roleCode: m.roleI, assignmentType: 'informed' },
          ];

          for (const a of assignments) {
            await query(
              `INSERT INTO "${schemaName}".grc_raci_assignments
               (assignment_id, entity_type, entity_id, role_code, assignment_type, module_code, is_default, created_at)
               VALUES (gen_random_uuid(), $1, NULL, $2, $3, $4, true, NOW())
               ON CONFLICT DO NOTHING`,
              [m.entityType, a.roleCode, a.assignmentType, moduleCode]
            ).catch(catchHandler(EC.EVENT_BUS, {}));
            created++;
          }
        } catch {
          warnings.push(`Failed to seed RACI for ${moduleCode}/${m.entityType}`);
        }
      }
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: created,
      recordsUpdated: 0,
      warnings,
      details: { raciTemplatesCreated: created },
    };
  }

  async rollback(ctx: ProvisioningContext): Promise<void> {
    await query(
      `DELETE FROM "${ctx.schemaName}".grc_raci_assignments WHERE is_default = true`
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}
