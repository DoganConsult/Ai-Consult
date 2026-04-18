#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const SCAN_DIRS = ['src', 'packages', 'services', 'products', 'migrations'];
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.sql']);
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', 'coverage', '.next', '.turbo', '.cache']);
const TEST_GLOB = /(\.test\.|\.spec\.|kernel-testkit|tools[\\/]|migrations[\\/])/i;

const MAX_LOC = 500;

const FORBIDDEN = [
  { re: /\bTODO\b/, label: 'TODO' },
  { re: /\bFIXME\b/, label: 'FIXME' },
  { re: /\bXXX\b/, label: 'XXX' },
  { re: /\bHACK\b/, label: 'HACK' },
  { re: /\bplaceholder\b/i, label: 'placeholder' },
  { re: /\bdummy\b/i, label: 'dummy' },
  { re: /\bsimulat(e|ed|ion)\b/i, label: 'simulate' },
  { re: /\btempfix\b|\btemp[_-]fix\b|\/\/\s*temp\b|\/\*\s*temp\b/i, label: 'temp' },
  { re: /\bnot[_\s-]?implemented\b/i, label: 'not implemented' },
  { re: /\bunimplemented\b/i, label: 'unimplemented' },
  { re: /\bcoming\s+soon\b/i, label: 'coming soon' },
  { re: /\bwork\s+in\s+progress\b|\bWIP\b/, label: 'WIP' },
  { re: /\bdeferred\b/i, label: 'deferred' },
  { re: /throw\s+new\s+Error\(\s*['"`]not\s+implemented/i, label: 'throw not implemented' },
];

const TEST_FORBIDDEN = FORBIDDEN.filter((f) =>
  !['placeholder', 'dummy', 'mock', 'stub', 'fake'].includes(f.label),
);

const PRODUCTION_ONLY = [
  { re: /\bmock\b/i, label: 'mock' },
  { re: /\bstub\b/i, label: 'stub' },
  { re: /\bfake\b/i, label: 'fake' },
];

async function readExempt() {
  try {
    const txt = await readFile(join(ROOT, 'tools/quality/exempt.txt'), 'utf8');
    return new Set(
      txt.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
    );
  } catch {
    return new Set();
  }
}

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIR.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && CODE_EXT.has(extname(e.name))) yield p;
  }
}

function isTestFile(rel) {
  return TEST_GLOB.test(rel);
}

async function main() {
  const exempt = await readExempt();
  const violations = [];

  for (const top of SCAN_DIRS) {
    for await (const file of walk(join(ROOT, top))) {
      const rel = relative(ROOT, file).split(sep).join('/');
      if (exempt.has(rel)) continue;

      const text = await readFile(file, 'utf8');
      const lines = text.split(/\r?\n/);

      if (lines.length > MAX_LOC) {
        violations.push({
          file: rel,
          rule: 'R1',
          msg: `file has ${lines.length} lines (cap ${MAX_LOC})`,
        });
      }

      const isTest = isTestFile(rel);
      const tokens = isTest ? TEST_FORBIDDEN : [...FORBIDDEN, ...PRODUCTION_ONLY];

      lines.forEach((line, i) => {
        for (const t of tokens) {
          if (t.re.test(line)) {
            violations.push({
              file: rel,
              rule: 'R2',
              msg: `forbidden token "${t.label}" at line ${i + 1}: ${line.trim().slice(0, 120)}`,
            });
          }
        }
      });
    }
  }

  if (violations.length === 0) {
    console.log('quality: OK (no violations)');
    process.exit(0);
  }

  for (const v of violations) {
    console.error(`[${v.rule}] ${v.file}: ${v.msg}`);
  }
  console.error(`\nquality: FAILED with ${violations.length} violation(s)`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
