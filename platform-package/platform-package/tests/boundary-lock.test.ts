import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const BACKEND_SRC = path.resolve(__dirname, '../backend/src');

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Platform Boundary Lock Tests', () => {
  const allFiles = getAllTsFiles(BACKEND_SRC);

  it('has platform source files', () => {
    expect(allFiles.length).toBeGreaterThan(0);
  });

  it('no imports from products/shahin-ai', () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes("products/shahin-ai") || content.includes("products/shahin")) {
        violations.push(path.relative(BACKEND_SRC, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('no imports from ../modules/ (product domain modules)', () => {
    const violations: string[] = [];
    const serverFiles = [
      path.join(BACKEND_SRC, 'server.ts'),
      path.join(BACKEND_SRC, 'server-routes.ts'),
      path.join(BACKEND_SRC, 'server-middleware.ts'),
      path.join(BACKEND_SRC, 'server-startup.ts'),
    ];
    for (const file of serverFiles) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes("from '") && line.includes('/modules/') && !line.trimStart().startsWith('//')) {
          violations.push(`${path.basename(file)}: ${line.trim()}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('no shahin-ai references in entry points', () => {
    const entryPoints = ['server.ts', 'server-routes.ts', 'server-middleware.ts', 'server-startup.ts'];
    const violations: string[] = [];
    for (const entry of entryPoints) {
      const file = path.join(BACKEND_SRC, entry);
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, 'utf-8').toLowerCase();
      if (content.includes('shahin')) {
        violations.push(entry);
      }
    }
    expect(violations).toEqual([]);
  });

  it('server.ts exists as standalone entry point', () => {
    expect(fs.existsSync(path.join(BACKEND_SRC, 'server.ts'))).toBe(true);
  });

  it('server-routes.ts exists', () => {
    expect(fs.existsSync(path.join(BACKEND_SRC, 'server-routes.ts'))).toBe(true);
  });

  it('platform/dos directory exists', () => {
    expect(fs.existsSync(path.join(BACKEND_SRC, 'platform/dos'))).toBe(true);
  });

  it('platform/dauth directory exists', () => {
    expect(fs.existsSync(path.join(BACKEND_SRC, 'platform/dauth'))).toBe(true);
  });

  it('no product route-catalogs directory', () => {
    expect(fs.existsSync(path.join(BACKEND_SRC, 'platform/route-catalogs'))).toBe(false);
  });

  it('no product products directory', () => {
    expect(fs.existsSync(path.join(BACKEND_SRC, 'platform/products'))).toBe(false);
  });
});
