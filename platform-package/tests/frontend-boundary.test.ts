import * as fs from 'fs';
import * as path from 'path';

const FRONTEND_SRC = path.resolve(__dirname, '../frontend/src');

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.html'))) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Frontend Boundary Lock Tests', () => {
  const allFiles = getAllTsFiles(FRONTEND_SRC);

  it('has frontend source files', () => {
    expect(allFiles.length).toBeGreaterThan(0);
  });

  it('no references to shahin-ai or shahin-grc', () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8').toLowerCase();
      if (content.includes('shahin-ai') || content.includes('shahin-grc') || content.includes('shahin_ai')) {
        violations.push(path.relative(FRONTEND_SRC, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('no references to products/shahin', () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('products/shahin')) {
        violations.push(path.relative(FRONTEND_SRC, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('no references to AGRC or agrc-product', () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('agrc-product') || content.includes('AGRC_PRODUCT')) {
        violations.push(path.relative(FRONTEND_SRC, file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('environment files use DOS Platform branding', () => {
    const envDir = path.join(FRONTEND_SRC, 'environments');
    expect(fs.existsSync(envDir)).toBe(true);
    const envFiles = fs.readdirSync(envDir).filter(f => f.endsWith('.ts'));
    expect(envFiles.length).toBeGreaterThanOrEqual(3);
    for (const f of envFiles) {
      const content = fs.readFileSync(path.join(envDir, f), 'utf-8');
      expect(content).toContain('DOS Platform');
      expect(content).not.toContain('Shahin');
    }
  });

  it('index.html uses DOS Platform branding', () => {
    const indexHtml = path.join(FRONTEND_SRC, '../index.html');
    if (!fs.existsSync(indexHtml)) return;
    const content = fs.readFileSync(indexHtml, 'utf-8');
    expect(content).toContain('DOS Platform');
    expect(content).not.toContain('Shahin-AI');
  });

  it('app component uses dos- prefix selector', () => {
    const appComponent = path.join(FRONTEND_SRC, 'app/app.component.ts');
    const content = fs.readFileSync(appComponent, 'utf-8');
    expect(content).toContain("selector: 'dos-root'");
  });

  it('core/dos directory exists with shell services', () => {
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/core/dos'))).toBe(true);
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/core/dos/shell/connectivity.service.ts'))).toBe(true);
  });

  it('core/dauth directory exists with auth services', () => {
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/core/dauth'))).toBe(true);
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/core/dauth/services/platform-auth.service.ts'))).toBe(true);
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/core/dauth/guards/auth.guard.ts'))).toBe(true);
  });

  it('core/infrastructure directory exists', () => {
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/core/infrastructure'))).toBe(true);
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/core/infrastructure/error/global-error-handler.service.ts'))).toBe(true);
  });

  it('shared directory exists with components', () => {
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/shared'))).toBe(true);
    expect(fs.existsSync(path.join(FRONTEND_SRC, 'app/shared/components/page-header/page-header.component.ts'))).toBe(true);
  });
});
