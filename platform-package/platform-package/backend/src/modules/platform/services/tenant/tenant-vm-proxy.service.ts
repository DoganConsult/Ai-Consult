/**
 * Tenant VM Proxy Service.
 *
 * Health-checks and manages connectivity to dedicated VM instances
 * for tenants with isolation_tier = 'dedicated_vm'.
 *
 * See docs/COMPILER-100-SPEC.md §5 (Tenant Isolation).
 */

import * as https from 'https';
import * as http from 'http';
import { query } from '../../../../config/database';

interface VmHealthResult {
  tenantId: string;
  vmEndpoint: string;
  healthy: boolean;
  responseTimeMs: number;
  error?: string;
  checkedAt: string;
}

/**
 * Health check a single VM endpoint.
 */
export async function checkVmHealth(
  vmEndpoint: string,
  timeoutMs: number = 10_000,
): Promise<{ healthy: boolean; responseTimeMs: number; error?: string }> {
  const start = Date.now();
  const url = new URL('/api/health', vmEndpoint);
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const req = transport.get(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        timeout: timeoutMs,
      },
      (res) => {
        const responseTimeMs = Date.now() - start;
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const healthy = (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 400;
          resolve({ healthy, responseTimeMs, error: healthy ? undefined : `HTTP ${res.statusCode}` });
        });
      },
    );

    req.on('error', (err) => {
      resolve({ healthy: false, responseTimeMs: Date.now() - start, error: (err instanceof Error ? err.message : String(err)) });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ healthy: false, responseTimeMs: Date.now() - start, error: 'Timeout' });
    });
  });
}

/**
 * Health-check all dedicated_vm tenants.
 */
export async function checkAllVmTenants(): Promise<VmHealthResult[]> {
  const result = await query(
    `SELECT tenant_id, vm_endpoint FROM public.tenants
     WHERE isolation_tier = 'dedicated_vm' AND vm_endpoint IS NOT NULL AND status = 'active'`,
  );

  const results: VmHealthResult[] = [];
  for (const row of result.rows) {
    const health = await checkVmHealth(row.vm_endpoint);
    results.push({
      tenantId: row.tenant_id,
      vmEndpoint: row.vm_endpoint,
      ...health,
      checkedAt: new Date().toISOString(),
    });
  }

  return results;
}
