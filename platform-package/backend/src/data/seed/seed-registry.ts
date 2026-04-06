import { safeQuery } from '../../config/database/database';
import { logger } from '../../platform/dos/observability/logger.service';

export async function seedRegistry(): Promise<void> {
  const products = [
    { code: 'dos', name: 'Dogan-AI Operating System', description: 'Core platform — DOS', status: 'enabled' },
    { code: 'dauth', name: 'Dogan Authentication', description: 'Identity and access management — DAuth', status: 'enabled' },
  ];

  for (const p of products) {
    await safeQuery(
      `INSERT INTO product_registry (code, name, description, status) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO UPDATE SET name = $2, description = $3`,
      [p.code, p.name, p.description, p.status]
    ).catch(() => {});
  }

  const modules = [
    { code: 'platform', name: 'Platform Core', status: 'enabled' },
    { code: 'dauth', name: 'DAuth Identity', status: 'enabled' },
    { code: 'audit', name: 'Audit & Events', status: 'enabled' },
    { code: 'provisioning', name: 'Provisioning & Bootstrap', status: 'enabled' },
    { code: 'tenancy', name: 'Tenancy & Workspaces', status: 'enabled' },
    { code: 'observability', name: 'Observability', status: 'enabled' },
    { code: 'ai', name: 'AI Governance', status: 'enabled' },
    { code: 'workflow', name: 'Workflow Engine', status: 'enabled' },
    { code: 'integration', name: 'Integrations', status: 'enabled' },
  ];

  for (const m of modules) {
    await safeQuery(
      `INSERT INTO module_registry (code, name, status) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = $2`,
      [m.code, m.name, m.status]
    ).catch(() => {});
  }

  const flags = [
    { flag_code: 'ai_gateway', enabled: false, owner_layer: 'platform' },
    { flag_code: 'mcp_server', enabled: false, owner_layer: 'platform' },
    { flag_code: 'temporal_workflows', enabled: false, owner_layer: 'platform' },
    { flag_code: 'clickhouse_analytics', enabled: false, owner_layer: 'platform' },
    { flag_code: 'apache_age_graph', enabled: false, owner_layer: 'platform' },
    { flag_code: 'openfga_authz', enabled: false, owner_layer: 'platform' },
    { flag_code: 'vector_search', enabled: false, owner_layer: 'platform' },
    { flag_code: 'pgmq_queues', enabled: false, owner_layer: 'platform' },
  ];

  for (const f of flags) {
    await safeQuery(
      `INSERT INTO feature_flags (flag_code, enabled, owner_layer) VALUES ($1, $2, $3) ON CONFLICT (flag_code) DO NOTHING`,
      [f.flag_code, f.enabled, f.owner_layer]
    ).catch(() => {});
  }

  const configDefaults = [
    { key: 'platform.version', value: '1.5.0' },
    { key: 'platform.name', value: 'Dogan-AI-OS' },
    { key: 'platform.max_tenants', value: '100' },
    { key: 'platform.governance_model', value: 'multi_level' },
    { key: 'platform.session_timeout_minutes', value: '30' },
    { key: 'platform.password_min_length', value: '12' },
    { key: 'platform.mfa_required', value: 'false' },
  ];

  for (const c of configDefaults) {
    await safeQuery(
      `INSERT INTO platform_operation_config (config_key, config_value) VALUES ($1, $2) ON CONFLICT (config_key) DO NOTHING`,
      [c.key, JSON.stringify(c.value)]
    ).catch(() => {});
  }

  logger.info(`[SeedRegistry] Seeded ${products.length} products, ${modules.length} modules, ${flags.length} flags, ${configDefaults.length} config defaults`);
}
