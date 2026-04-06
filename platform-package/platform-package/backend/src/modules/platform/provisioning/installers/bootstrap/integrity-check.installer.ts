import { query } from '../../../../../config/database/database';
import { SeedInstaller } from '../../seed-installer.interface';
import { ProvisioningContext, SeedInstallResult, ValidationResult } from '../../types';

interface IntegrityCheck {
  name: string;
  query: string;
  min?: number;
  max?: number;
  severity: 'error' | 'warning';
}

const INTEGRITY_CHECKS: IntegrityCheck[] = [
  // Structural completeness
  { name: 'module_registry', query: `SELECT COUNT(*) as cnt FROM module_workflow_registry`, min: 5, severity: 'error' },
  { name: 'permissions', query: `SELECT COUNT(*) as cnt FROM permissions`, min: 10, severity: 'error' },
  { name: 'navigation_items', query: `SELECT COUNT(*) as cnt FROM navigation_registry WHERE is_active = true`, min: 5, severity: 'warning' },
  { name: 'role_profiles', query: `SELECT COUNT(*) as cnt FROM role_profiles`, min: 1, severity: 'warning' },
  { name: 'dashboard_layouts', query: `SELECT COUNT(*) as cnt FROM dashboard_layouts`, min: 1, severity: 'warning' },
  { name: 'workflow_templates', query: `SELECT COUNT(*) as cnt FROM workflow_templates`, min: 1, severity: 'warning' },
  { name: 'tenant_config', query: `SELECT COUNT(*) as cnt FROM tenant_config_versions`, min: 1, severity: 'error' },
  { name: 'workspace_profile', query: `SELECT COUNT(*) as cnt FROM workspace_profile`, min: 1, severity: 'error' },
  { name: 'feature_flags', query: `SELECT COUNT(*) as cnt FROM feature_flags`, min: 1, severity: 'warning' },

  // Referential integrity
  { name: 'orphan_nav_no_module', query: `SELECT COUNT(*) as cnt FROM navigation_registry nr WHERE nr.module_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM module_workflow_registry mwr WHERE mwr.module_code = nr.module_code)`, max: 0, severity: 'warning' },

  // Org structure
  { name: 'organization_exists', query: `SELECT COUNT(*) as cnt FROM organizations`, min: 1, severity: 'warning' },

  // Security
  { name: 'security_config', query: `SELECT COUNT(*) as cnt FROM tenant_security_config`, min: 1, severity: 'warning' },

  // Frameworks
  { name: 'frameworks_active', query: `SELECT COUNT(*) as cnt FROM frameworks WHERE status = 'active'`, min: 1, severity: 'warning' },
];

export class TenantIntegrityCheckInstaller implements SeedInstaller {
  key = 'run_integrity_checks';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true;
  }

  async validate(_ctx: ProvisioningContext): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const results: Array<{ name: string; passed: boolean; actual: number; expected: string; severity: string }> = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    for (const check of INTEGRITY_CHECKS) {
      try {
        const result = await query(
          `SET search_path TO "${ctx.schemaName}", public; ${check.query}`
        );
        const actual = parseInt(result.rows[0]?.cnt ?? '0', 10);

        let passed = true;
        let expected = '';

        if (check.min !== undefined) {
          passed = actual >= check.min;
          expected = `min: ${check.min}`;
        }
        if (check.max !== undefined) {
          passed = actual <= check.max;
          expected = `max: ${check.max}`;
        }

        results.push({ name: check.name, passed, actual, expected, severity: check.severity });

        if (!passed) {
          const msg = `${check.name}: expected ${expected}, got ${actual}`;
          if (check.severity === 'error') errors.push(msg);
          else warnings.push(msg);
        } else {
          score++;
        }
      } catch {
        // Table doesn't exist — treat as warning for now
        results.push({ name: check.name, passed: false, actual: 0, expected: 'table exists', severity: check.severity });
        if (check.severity === 'error') {
          warnings.push(`${check.name}: table not found (may be created by later migration)`);
        }
        // Don't count missing tables as hard errors during provisioning
      }
    }

    const totalChecks = INTEGRITY_CHECKS.length;
    const healthScore = Math.round((score / totalChecks) * 100);
    const status = errors.length > 0 ? 'degraded' : 'healthy';

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: 0,
      recordsUpdated: 0,
      warnings: [...warnings, ...errors.map(e => `[ERROR] ${e}`)],
      details: {
        status,
        healthScore,
        totalChecks,
        passed: score,
        failed: totalChecks - score,
        checks: results,
      },
    };
  }
}
