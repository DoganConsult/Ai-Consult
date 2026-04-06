import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MISC_DIR = path.resolve(__dirname);

const SHIM_FILES = fs.readdirSync(MISC_DIR)
  .filter(f => f.endsWith('.service.ts') && !f.endsWith('.test.ts'))
  .map(f => f.replace(/\.ts$/, ''));

const SUBDIRECTORIES = fs.readdirSync(MISC_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

describe('misc/ restructuring — re-export shim integrity', () => {
  it('should have shim files at the misc/ level', () => {
    expect(SHIM_FILES.length).toBeGreaterThan(100);
  });

  it('should have subdirectories for concern-based grouping', () => {
    const expected = [
      'ai-copilot', 'compliance', 'configuration-registry',
      'content-packs', 'document-generation', 'grc-engine',
      'infrastructure-core', 'localization-i18n', 'migration-data',
      'monitoring-observability', 'nudge-engine', 'onboarding-journey',
      'search', 'security-privacy', 'subscriptions-billing',
      'ui-interactions', 'webhooks-messaging',
    ];
    for (const dir of expected) {
      expect(SUBDIRECTORIES, `Missing subdirectory: ${dir}`).toContain(dir);
    }
  });

  it('every shim file should contain an export statement', () => {
    const failures: string[] = [];
    for (const shim of SHIM_FILES) {
      const content = fs.readFileSync(path.join(MISC_DIR, `${shim}.ts`), 'utf-8');
      if (!content.includes('export ')) {
        failures.push(shim);
      }
    }
    expect(failures, `Shims without exports: ${failures.join(', ')}`).toHaveLength(0);
  });

  it('every shim file should re-export from a subdirectory (not contain business logic)', () => {
    const suspicious: string[] = [];
    for (const shim of SHIM_FILES) {
      const filePath = path.join(MISC_DIR, `${shim}.ts`);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      const trimmed = content
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/*') && !l.trim().startsWith('*'))
        .join('\n');
      const hasReExport = /export\s+\*\s+from/.test(trimmed) || /export\s+\{[^}]+\}\s+from/.test(trimmed);
      if (!hasReExport) {
        suspicious.push(shim);
      }
    }
    expect(suspicious, `Non-shim files at misc/ root: ${suspicious.join(', ')}`).toHaveLength(0);
  });
});

describe('misc/ restructuring — critical import path fixes', () => {
  it('capability-gating.service should import from ai/tools/ at correct depth', () => {
    const filePath = path.join(MISC_DIR, 'configuration-registry', 'capability-gating.service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("from '../../../../../ai/tools/tool-registry'");
    expect(content).toContain("from '../../../../../ai/tools/tool-base'");
    expect(content).not.toContain("from '../../../../ai/tools/tool-registry'");
  });

  it('journey-engine.service should import template-engine from shim level', () => {
    const filePath = path.join(MISC_DIR, 'onboarding-journey', 'journey-engine.service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("'../template-engine.service'");
    expect(content).not.toContain("'./template-engine.service'");
  });

  it('onboarding-complete.runner should import sop-library from shim level', () => {
    const filePath = path.join(MISC_DIR, 'onboarding-journey', 'onboarding-complete.runner.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('../sop-library.service');
    expect(content).not.toMatch(/import\(["']\.\/sop-library\.service["']\)/);
  });

  it('base-crud.service should import ValidationError from root errors (array constructor)', () => {
    const filePath = path.join(MISC_DIR, 'ui-interactions', 'base-crud.service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("from '../../../../../errors/index'");
    expect(content).not.toContain("from '../../../../errors/index'");
  });

  it('logger.service shim should re-export from DOS observability', () => {
    const filePath = path.join(MISC_DIR, 'monitoring-observability', 'logger.service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("platform/dos/observability/logger.service");
  });
});

describe('misc/ restructuring — nav-seeding and settings-resolver http-error path', () => {
  it('nav-seeding.service should import http-error.util at correct depth', () => {
    const filePath = path.resolve(__dirname, '../../../../platform/dos/foundation/nav-seeding.service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("from '../../../errors/http-error.util'");
    expect(content).not.toContain("from '../../errors/http-error.util'");
  });

  it('settings-resolver.service should import http-error.util at correct depth', () => {
    const filePath = path.resolve(__dirname, '../../../../platform/dos/settings/settings-resolver.service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("from '../../../errors/http-error.util'");
    expect(content).not.toContain("from '../../errors/http-error.util'");
  });
});

describe('ValidationError — constructor compatibility', () => {
  it('root errors/index.ts ValidationError should accept array-of-objects', () => {
    const errorsPath = path.resolve(__dirname, '../../../../errors/index.ts');
    const content = fs.readFileSync(errorsPath, 'utf-8');
    expect(content).toMatch(/class ValidationError/);
    expect(content).toMatch(/details:\s*Array<\{/);
  });
});

describe('onboarding.module — hardDeps validity', () => {
  it('should not reference dos or dauth as hardDeps (platform layers, not module codes)', () => {
    const filePath = path.resolve(__dirname, '../../../onboarding/onboarding.module.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const hardDepsMatch = content.match(/hardDeps:\s*\[([^\]]*)\]/);
    expect(hardDepsMatch).toBeTruthy();
    const deps = hardDepsMatch![1].trim();
    expect(deps).not.toContain("'dos'");
    expect(deps).not.toContain("'dauth'");
  });
});

describe('journey-ai.service — import path corrections', () => {
  it('should import nudge-engine from misc/ (not direct sibling)', () => {
    const filePath = path.resolve(__dirname, '../contextual-ai/journey-ai.service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("from '../misc/nudge-engine.service'");
    expect(content).not.toContain("from '../nudge-engine.service'");
  });

  it('should import setup-wizard from canonical DOS path', () => {
    const filePath = path.resolve(__dirname, '../contextual-ai/journey-ai.service.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("platform/dos/provisioning/setup-wizard.service");
    expect(content).not.toContain("from '../setup-wizard.service'");
  });
});
