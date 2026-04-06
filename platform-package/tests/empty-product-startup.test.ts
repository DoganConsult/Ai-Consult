import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const BACKEND_SRC = path.resolve(__dirname, '../backend/src');

describe('Empty Product Startup Tests', () => {
  it('server.ts has no product side-effect imports', () => {
    const serverTs = fs.readFileSync(path.join(BACKEND_SRC, 'server.ts'), 'utf-8');
    const importLines = serverTs.split('\n').filter(l => l.startsWith('import '));

    const productImports = importLines.filter(l =>
      l.includes('products/') ||
      l.includes('shahin') ||
      l.includes('agrc-product') ||
      l.includes('shahin-module-crud') ||
      l.includes('shahin-ai-asset')
    );

    expect(productImports).toEqual([]);
  });

  it('server-startup.ts has no product bootstrap hooks', () => {
    const startup = fs.readFileSync(path.join(BACKEND_SRC, 'server-startup.ts'), 'utf-8');
    expect(startup).not.toContain('registerProductBootstrapHook');
    expect(startup).not.toContain('AGRC_PRODUCT_MANIFEST');
    expect(startup).not.toContain('bootstrapAiGovernance');
  });

  it('startup/phase-secrets-config.ts has no product references', () => {
    const phase = fs.readFileSync(path.join(BACKEND_SRC, 'startup/phase-secrets-config.ts'), 'utf-8');
    expect(phase).not.toContain('CANONICAL_AGRC_MODULE_CODES');
    expect(phase).not.toContain('registerDefaultProductModule');
    expect(phase).not.toContain('registerProductManifest');
    expect(phase).not.toContain('AGRC_PRODUCT_MANIFEST');
  });

  it('startup/phase-event-subscribers.ts has no product event subscribers', () => {
    const phase = fs.readFileSync(path.join(BACKEND_SRC, 'startup/phase-event-subscribers.ts'), 'utf-8');
    expect(phase).not.toContain('registerAgrcEventSubscribers');
    expect(phase).not.toContain('products/agrc');
    expect(phase).not.toContain('mountProductRoutesFromDbFilteredCatalog');
  });

  it('startup/phase-cron-jobs.ts has no product schedulers', () => {
    const phase = fs.readFileSync(path.join(BACKEND_SRC, 'startup/phase-cron-jobs.ts'), 'utf-8');
    expect(phase).not.toContain('AgrcEngineScheduler');
    expect(phase).not.toContain('agrc-engine');
  });

  it('startup/phase-server-listen.ts has no product references', () => {
    const phase = fs.readFileSync(path.join(BACKEND_SRC, 'startup/phase-server-listen.ts'), 'utf-8');
    expect(phase).not.toContain('governance-os');
    expect(phase).not.toContain('openclaw');
    expect(phase).not.toContain('ProvisioningJobService');
  });

  it('startup/phase-migrations-seeds.ts has no product seeds', () => {
    const phase = fs.readFileSync(path.join(BACKEND_SRC, 'startup/phase-migrations-seeds.ts'), 'utf-8');
    expect(phase).not.toContain('seedQuestionBank');
    expect(phase).not.toContain('seedOnboardingQuestionBank');
    expect(phase).not.toContain('seedAssessmentTemplates');
    expect(phase).not.toContain('seedQuotes');
    expect(phase).not.toContain('seedLandingContent');
    expect(phase).not.toContain('syncAllProductsToDb');
  });

  it('server-routes.ts has no product route mounts', () => {
    const routes = fs.readFileSync(path.join(BACKEND_SRC, 'server-routes.ts'), 'utf-8');
    expect(routes).not.toContain('v1ApiRewriteMiddleware');
    expect(routes).not.toContain('mountProductRoutes');
    expect(routes).not.toContain('ROUTE_CATALOG');
    expect(routes).not.toContain('vendor-portal');
    expect(routes).not.toContain('regulator-portal');
    expect(routes).not.toContain('consultant-center');
  });

  it('no product-owned modules in platform-package (no governance, risk, vendor, etc.)', () => {
    const modulesDir = path.join(BACKEND_SRC, 'modules');
    if (!fs.existsSync(modulesDir)) return;
    const productModules = ['governance', 'risk', 'vendor', 'evidence', 'policy',
      'incident', 'exception', 'remediation', 'bcp', 'asset', 'training',
      'qiyas', 'reporting', 'dora', 'journey', 'ksa-regulatory',
      'local-knowledge', 'proactive-leadership', 'governance-os',
      'governance-ai', 'records', 'privacy', 'portals', 'widgets'];
    const present = productModules.filter(m => fs.existsSync(path.join(modulesDir, m)));
    expect(present).toEqual([]);
  });

  it('platform directory structure is intact', () => {
    expect(fs.existsSync(path.join(BACKEND_SRC, 'platform/dos'))).toBe(true);
    expect(fs.existsSync(path.join(BACKEND_SRC, 'platform/dauth'))).toBe(true);
    expect(fs.existsSync(path.join(BACKEND_SRC, 'platform/contracts'))).toBe(true);
    expect(fs.existsSync(path.join(BACKEND_SRC, 'platform/routing'))).toBe(true);
  });
});
