import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.resolve(__dirname, '../backend/src/migrations');

describe('Platform Migration Tests', () => {
  it('migrations directory exists', () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
  });

  it('master migrations directory exists', () => {
    const masterDir = path.join(MIGRATIONS_DIR, 'master');
    expect(fs.existsSync(masterDir)).toBe(true);
  });

  it('tenant migrations directory exists', () => {
    const tenantDir = path.join(MIGRATIONS_DIR, 'tenant');
    expect(fs.existsSync(tenantDir)).toBe(true);
  });

  it('master migrations contain SQL files', () => {
    const masterDir = path.join(MIGRATIONS_DIR, 'master');
    if (!fs.existsSync(masterDir)) return;
    const sqlFiles = fs.readdirSync(masterDir).filter(f => f.endsWith('.sql'));
    expect(sqlFiles.length).toBeGreaterThan(0);
  });

  it('tenant migrations contain SQL files', () => {
    const tenantDir = path.join(MIGRATIONS_DIR, 'tenant');
    if (!fs.existsSync(tenantDir)) return;
    const sqlFiles = fs.readdirSync(tenantDir).filter(f => f.endsWith('.sql'));
    expect(sqlFiles.length).toBeGreaterThan(0);
  });

  it('migration files are properly numbered', () => {
    const masterDir = path.join(MIGRATIONS_DIR, 'master');
    if (!fs.existsSync(masterDir)) return;
    const sqlFiles = fs.readdirSync(masterDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of sqlFiles) {
      expect(file).toMatch(/^\d+/);
    }
  });

  it('no product-specific migration references in SQL', () => {
    const checkDir = (dir: string) => {
      if (!fs.existsSync(dir)) return [];
      const violations: string[] = [];
      const sqlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));
      for (const file of sqlFiles) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8').toLowerCase();
        if (content.includes('shahin_product') || content.includes('agrc_product_only')) {
          violations.push(file);
        }
      }
      return violations;
    };

    const masterViolations = checkDir(path.join(MIGRATIONS_DIR, 'master'));
    const tenantViolations = checkDir(path.join(MIGRATIONS_DIR, 'tenant'));
    expect([...masterViolations, ...tenantViolations]).toEqual([]);
  });

  it('migration runner exists', () => {
    const runnerPath = path.join(MIGRATIONS_DIR, 'runner.ts');
    expect(fs.existsSync(runnerPath)).toBe(true);
  });
});
