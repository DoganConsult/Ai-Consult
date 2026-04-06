import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const BACKEND_SRC = path.join(ROOT, 'backend/src');

describe('Production Gap Closure — Seed Implementations', () => {
  describe('seed-platform-admin.ts', () => {
    const filePath = path.join(BACKEND_SRC, 'data/seed/seed-platform-admin.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    it('exports seedPlatformAdmin function', () => {
      expect(content).toContain('export async function seedPlatformAdmin');
    });

    it('does not throw "not implemented"', () => {
      expect(content).not.toContain("throw new Error('not implemented')");
      expect(content).not.toContain('throw new Error("not implemented")');
    });

    it('seeds exactly 8 access profiles', () => {
      const profileMatches = content.match(/\{\s*code:\s*'/g);
      const profileSection = content.substring(
        content.indexOf('const profiles'),
        content.indexOf('const roles')
      );
      const profileCodes = profileSection.match(/code:\s*'[^']+'/g) || [];
      expect(profileCodes.length).toBe(8);
    });

    it('seeds required access profile codes', () => {
      const requiredProfiles = [
        'platform_super_admin', 'tenant_admin', 'product_admin', 'module_admin',
        'security_admin', 'standard_user', 'viewer', 'external_auditor',
      ];
      for (const code of requiredProfiles) {
        expect(content).toContain(`code: '${code}'`);
      }
    });

    it('seeds exactly 7 functional roles', () => {
      const roleSection = content.substring(
        content.indexOf('const roles'),
        content.indexOf('const permissions')
      );
      const roleCodes = roleSection.match(/\bcode:\s*'[^']+'/g) || [];
      const roleOnly = roleCodes.filter(c => !c.includes('module_code'));
      expect(roleOnly.length).toBe(7);
    });

    it('seeds exactly 20 permissions', () => {
      const permSection = content.substring(
        content.indexOf('const permissions'),
        content.indexOf('for (const p of permissions)')
      );
      const permCodes = permSection.match(/code:\s*'platform\.[^']+'/g) || [];
      expect(permCodes.length).toBe(20);
    });

    it('uses ON CONFLICT for idempotency', () => {
      expect(content).toContain('ON CONFLICT');
    });

    it('uses catch guards for resilience', () => {
      const catchCount = (content.match(/\.catch\(\(\)/g) || []).length;
      expect(catchCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('seed-registry.ts', () => {
    const filePath = path.join(BACKEND_SRC, 'data/seed/seed-registry.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    it('exports seedRegistry function', () => {
      expect(content).toContain('export async function seedRegistry');
    });

    it('does not throw "not implemented"', () => {
      expect(content).not.toContain("throw new Error('not implemented')");
    });

    it('seeds exactly 2 products (dos, dauth)', () => {
      const productSection = content.substring(
        content.indexOf('const products'),
        content.indexOf('const modules')
      );
      const productCodes = productSection.match(/code:\s*'[^']+'/g) || [];
      expect(productCodes.length).toBe(2);
      expect(content).toContain("code: 'dos'");
      expect(content).toContain("code: 'dauth'");
    });

    it('seeds exactly 9 modules', () => {
      const moduleSection = content.substring(
        content.indexOf('const modules'),
        content.indexOf('const flags')
      );
      const moduleCodes = moduleSection.match(/code:\s*'[^']+'/g) || [];
      expect(moduleCodes.length).toBe(9);
    });

    it('seeds exactly 8 feature flags', () => {
      const flagSection = content.substring(
        content.indexOf('const flags'),
        content.indexOf('const configDefaults')
      );
      const flagCodes = flagSection.match(/flag_code:\s*'[^']+'/g) || [];
      expect(flagCodes.length).toBe(8);
    });

    it('seeds exactly 7 config defaults', () => {
      const configSection = content.substring(
        content.indexOf('const configDefaults'),
        content.indexOf('for (const c of configDefaults)')
      );
      const configKeys = configSection.match(/key:\s*'[^']+'/g) || [];
      expect(configKeys.length).toBe(7);
    });

    it('uses ON CONFLICT for idempotency', () => {
      expect(content).toContain('ON CONFLICT');
    });
  });
});

describe('Production Gap Closure — Server Wiring', () => {
  describe('server.ts calls mountFinalHandlers', () => {
    const serverPath = path.join(BACKEND_SRC, 'server.ts');
    const content = fs.readFileSync(serverPath, 'utf-8');

    it('imports mountFinalHandlers from server-routes', () => {
      expect(content).toContain('mountFinalHandlers');
      expect(content).toMatch(/import\s*\{[^}]*mountFinalHandlers[^}]*\}\s*from\s*'\.\/server-routes'/);
    });

    it('calls mountFinalHandlers(app) after mountRoutes(app)', () => {
      const mountRoutesIdx = content.indexOf('mountRoutes(app)');
      const mountFinalIdx = content.indexOf('mountFinalHandlers(app)');
      expect(mountRoutesIdx).toBeGreaterThan(-1);
      expect(mountFinalIdx).toBeGreaterThan(-1);
      expect(mountFinalIdx).toBeGreaterThan(mountRoutesIdx);
    });
  });

  describe('server-routes.ts serves frontend static files', () => {
    const routesPath = path.join(BACKEND_SRC, 'server-routes.ts');
    const content = fs.readFileSync(routesPath, 'utf-8');

    it('exports mountFinalHandlers function', () => {
      expect(content).toContain('export function mountFinalHandlers');
    });

    it('serves static files from frontend dist', () => {
      expect(content).toContain('express.static');
      expect(content).toContain('frontend/dist/dos-platform/browser');
    });

    it('has SPA fallback for index.html', () => {
      expect(content).toContain('index.html');
      expect(content).toContain('sendFile');
    });

    it('has 404 handler for API routes', () => {
      expect(content).toContain('NOT_FOUND');
      expect(content).toContain('404');
    });

    it('has error handler at the end', () => {
      expect(content).toContain('errorHandler');
    });
  });
});

describe('Production Gap Closure — Build Script', () => {
  const buildPath = path.join(ROOT, 'scripts/build.sh');
  const content = fs.readFileSync(buildPath, 'utf-8');

  it('build.sh exists and is executable-format', () => {
    expect(content).toMatch(/^#!\/.*bash/);
    expect(content).toContain('set -euo pipefail');
  });

  it('includes backend dependency install step', () => {
    expect(content).toContain('pnpm install');
    expect(content).toContain('backend');
  });

  it('includes backend typecheck step', () => {
    expect(content).toContain('typecheck');
  });

  it('includes backend compile step', () => {
    expect(content).toContain('pnpm run build');
  });

  it('includes frontend dependency install step', () => {
    expect(content).toContain('frontend');
    expect(content).toMatch(/cd.*frontend/);
  });

  it('includes frontend build step', () => {
    expect(content).toContain('dos-platform/browser/index.html');
  });

  it('includes deployment verification step', () => {
    expect(content).toContain('Verifying deployment');
  });

  it('has all 6 steps', () => {
    for (let i = 1; i <= 6; i++) {
      expect(content).toContain(`[${i}/6]`);
    }
  });
});

describe('Production Gap Closure — Smoke Test Script', () => {
  const smokePath = path.join(ROOT, 'scripts/smoke-test.sh');
  const content = fs.readFileSync(smokePath, 'utf-8');

  it('tests core health endpoints', () => {
    expect(content).toContain('/api/health');
    expect(content).toContain('/api/health/live');
    expect(content).toContain('/api/health/ready');
  });

  it('tests auth endpoints', () => {
    expect(content).toContain('/api/auth/login');
    expect(content).toContain('/api/auth/userinfo');
  });

  it('tests platform admin endpoints (auth-required)', () => {
    expect(content).toContain('/api/platform/admin/overview');
    expect(content).toContain('/api/platform/admin/governance-matrix');
    expect(content).toContain('/api/platform/admin/access-profiles');
    expect(content).toContain('/api/platform/admin/permissions');
    expect(content).toContain('/api/platform/admin/products');
    expect(content).toContain('/api/platform/admin/modules');
    expect(content).toContain('/api/platform/admin/feature-flags');
    expect(content).toContain('/api/platform/admin/platform-config');
  });

  it('tests frontend static serving', () => {
    expect(content).toContain('frontend SPA');
  });

  it('validates health response body fields', () => {
    expect(content).toContain('check_json');
    expect(content).toContain('"status"');
    expect(content).toContain('"version"');
  });
});

describe('Production Gap Closure — Governance Migration', () => {
  const migrationPath = path.join(BACKEND_SRC, 'migrations/master/115_governance_control_plane_tables.sql');
  const content = fs.readFileSync(migrationPath, 'utf-8');

  it('creates platform_audit_logs table', () => {
    expect(content).toContain('CREATE TABLE IF NOT EXISTS platform_audit_logs');
  });

  it('creates system_events table', () => {
    expect(content).toContain('CREATE TABLE IF NOT EXISTS system_events');
  });

  it('creates tenant_product_activation table', () => {
    expect(content).toContain('CREATE TABLE IF NOT EXISTS tenant_product_activation');
  });

  it('includes indexes for audit logs', () => {
    expect(content).toContain('idx_platform_audit_logs_actor');
    expect(content).toContain('idx_platform_audit_logs_created');
  });

  it('includes indexes for system events', () => {
    expect(content).toContain('idx_system_events_type');
    expect(content).toContain('idx_system_events_occurred');
  });

  it('tenant_product_activation has unique constraint', () => {
    expect(content).toContain('UNIQUE (tenant_id, product_code)');
  });
});

describe('Production Gap Closure — Platform Admin Routes', () => {
  const routesPath = path.join(BACKEND_SRC, 'platform/dos/admin/platform-admin.routes.ts');
  const content = fs.readFileSync(routesPath, 'utf-8');

  const requiredEndpoints = [
    '/overview', '/access-profiles', '/functional-roles', '/permissions',
    '/role-permissions', '/delegations', '/sod-rules',
    '/products', '/modules', '/feature-flags', '/platform-config',
    '/audit-logs', '/system-events', '/login-attempts',
    '/governance-matrix', '/tenant-activations',
    '/ai/models', '/ai/agents', '/ai/prompts',
  ];

  for (const endpoint of requiredEndpoints) {
    it(`has route for ${endpoint}`, () => {
      expect(content).toContain(`'${endpoint}'`);
    });
  }

  it('all routes require authentication', () => {
    const routeLines = content.split('\n').filter(l => l.match(/router\.(get|post|patch|put|delete)\(/));
    for (const line of routeLines) {
      expect(line).toContain('authenticate');
    }
  });

  it('uses asyncHandler for all routes', () => {
    const routeLines = content.split('\n').filter(l => l.match(/router\.(get|post|patch|put|delete)\(/));
    for (const line of routeLines) {
      expect(line).toContain('asyncHandler');
    }
  });
});

describe('Production Gap Closure — Frontend ↔ Backend Parity', () => {
  const servicePath = path.join(ROOT, 'frontend/src/app/core/dos/services/platform-admin.service.ts');
  const content = fs.readFileSync(servicePath, 'utf-8');

  const requiredMethods = [
    'getOverview', 'getAccessProfiles', 'createAccessProfile',
    'getFunctionalRoles', 'createFunctionalRole',
    'getPermissions', 'createPermission',
    'getRolePermissions', 'assignRolePermission',
    'getUserAccess', 'assignUserProfile', 'assignUserRole',
    'getDelegations', 'createDelegation',
    'getSodRules', 'createSodRule',
    'getProducts', 'enableProduct', 'disableProduct',
    'getModules', 'enableModule', 'disableModule',
    'getFeatureFlags', 'updateFeatureFlag',
    'getPlatformConfig', 'updatePlatformConfig',
    'getAuditLogs', 'getSystemEvents', 'getLoginAttempts',
    'getGovernanceMatrix', 'getTenantActivations',
    'getAiModels', 'getAiAgents', 'getAiPrompts',
  ];

  for (const method of requiredMethods) {
    it(`PlatformAdminService has ${method}()`, () => {
      expect(content).toContain(`${method}(`);
    });
  }

  it('service base URL points to /platform/admin', () => {
    expect(content).toContain('/platform/admin');
  });

  it('service is injectable (providedIn root)', () => {
    expect(content).toContain("providedIn: 'root'");
  });
});
