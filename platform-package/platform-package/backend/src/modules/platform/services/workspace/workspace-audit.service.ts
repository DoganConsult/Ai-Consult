import { logger } from '../../../../utils/logger';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const PREFIX = '[WorkspaceAudit]';
const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');
const LATEST_FILE = path.join(REPORTS_DIR, 'workspace-audit-latest.json');
const HISTORY_FILE = path.join(REPORTS_DIR, 'workspace-audit-history.json');
const MAX_HISTORY = 144;

export interface ComponentTrackingResult {
  category: string;
  group: string;
  total: number;
  tracked: number;
  untracked: number;
  modified: number;
  staged: number;
  files: string[];
  health: 'green' | 'yellow' | 'red';
}

export interface CodeQualityResult {
  tscErrors: number;
  tscOutput: string;
  topErrorFiles: { file: string; count: number }[];
}

export interface GitDiffStat {
  insertions: number;
  deletions: number;
  filesChanged: number;
}

export interface WorkspaceAuditReport {
  timestamp: string;
  durationMs: number;
  git: {
    branch: string;
    lastCommitHash: string;
    lastCommitMessage: string;
    lastCommitAge: string;
    staged: number;
    modified: number;
    untracked: number;
    deleted: number;
    totalUncommitted: number;
    untrackedFiles: string[];
    modifiedFiles: string[];
    stagedFiles: string[];
    diffStat: GitDiffStat;
  };
  components: ComponentTrackingResult[];
  componentSummary: {
    totalCategories: number;
    healthyCategories: number;
    warningCategories: number;
    criticalCategories: number;
    totalTracked: number;
    totalUntracked: number;
    totalModified: number;
  };
  codeQuality: CodeQualityResult;
  alerts: string[];
  status: 'clean' | 'warnings' | 'critical';
  trend: 'improving' | 'stable' | 'degrading' | 'any';
}

export interface AuditHistoryEntry {
  timestamp: string;
  status: string;
  totalUncommitted: number;
  untracked: number;
  modified: number;
  staged: number;
  tscErrors: number;
  healthyCategories: number;
  warningCategories: number;
  criticalCategories: number;
}

function exec(cmd: string, cwd: string = REPO_ROOT): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 60_000 }).trim();
  } catch {
    return '';
  }
}

function discoverModuleDirectories(): { dirPath: string; group: string; label: string }[] {
  const discovered: { dirPath: string; group: string; label: string }[] = [];

  const backendSrc = path.join(REPO_ROOT, 'backend', 'src');
  const frontendSrc = path.join(REPO_ROOT, 'frontend', 'src');

  const staticEntries: { dirPath: string; group: string; label: string }[] = [
    { dirPath: 'backend/src/temporal/workflows', group: 'Temporal', label: 'Workflows' },
    { dirPath: 'backend/src/temporal/activities', group: 'Temporal', label: 'Activities' },
    { dirPath: 'backend/src/temporal/workers', group: 'Temporal', label: 'Workers' },
    { dirPath: 'backend/src/temporal/schedules', group: 'Temporal', label: 'Schedules' },
    { dirPath: 'backend/src/temporal/resilience', group: 'Temporal', label: 'Resilience' },
    { dirPath: 'backend/src/ai/graphs', group: 'LangGraph', label: 'Graphs' },
    { dirPath: 'backend/src/ai/graphs/nodes', group: 'LangGraph', label: 'Nodes' },
    { dirPath: 'backend/src/ai/graphs/edges', group: 'LangGraph', label: 'Edges' },
    { dirPath: 'backend/src/ai/tools', group: 'AI Agents', label: 'Tools' },
    { dirPath: 'backend/src/ai/observability', group: 'AI Agents', label: 'Observability' },
    { dirPath: 'backend/src/langgraph/config', group: 'LangGraph', label: 'Config' },
    { dirPath: 'backend/src/schemas', group: 'Infrastructure', label: 'Schemas' },
    { dirPath: 'backend/src/middleware', group: 'Infrastructure', label: 'Middleware' },
    { dirPath: 'backend/src/connectors', group: 'Infrastructure', label: 'Connectors' },
    { dirPath: 'backend/src/config', group: 'Infrastructure', label: 'Config' },
    { dirPath: 'backend/src/config/db', group: 'Infrastructure', label: 'Database Config' },
    { dirPath: 'backend/src/migrations/master', group: 'Migrations', label: 'Master' },
    { dirPath: 'backend/src/migrations/tenant', group: 'Migrations', label: 'Tenant' },
  ];

  for (const entry of staticEntries) {
    const fullPath = path.join(REPO_ROOT, entry.dirPath);
    if (fs.existsSync(fullPath)) {
      discovered.push(entry);
    }
  }

  const modulesDir = path.join(backendSrc, 'modules');
  if (fs.existsSync(modulesDir)) {
    const modules = fs.readdirSync(modulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const mod of modules) {
      const modPath = path.join(modulesDir, mod);
      const subDirs = fs.readdirSync(modPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const sub of subDirs) {
        discovered.push({
          dirPath: `backend/src/modules/${mod}/${sub}`,
          group: mod.charAt(0).toUpperCase() + mod.slice(1).replace(/-/g, ' '),
          label: sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, ' '),
        });
      }

      const hasDirectFiles = fs.readdirSync(modPath, { withFileTypes: true })
        .some((d) => d.isFile() && d.name.endsWith('.ts'));
      if (hasDirectFiles) {
        discovered.push({
          dirPath: `backend/src/modules/${mod}`,
          group: mod.charAt(0).toUpperCase() + mod.slice(1).replace(/-/g, ' '),
          label: 'Root Files',
        });
      }
    }
  }

  const doganOsDir = path.join(backendSrc, 'modules', 'platform', 'dogan-os');
  if (fs.existsSync(doganOsDir)) {
    discovered.push({
      dirPath: 'backend/src/modules/platform/dogan-os',
      group: 'Dogan OS',
      label: 'Guardian Workers',
    });
  }

  const servicesDir = path.join(backendSrc, 'services');
  if (fs.existsSync(servicesDir)) {
    discovered.push({
      dirPath: 'backend/src/services',
      group: 'Core Services',
      label: 'Services',
    });

    const svcSubs = fs.readdirSync(servicesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const sub of svcSubs) {
      discovered.push({
        dirPath: `backend/src/services/${sub}`,
        group: 'Core Services',
        label: sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, ' '),
      });
    }
  }

  const routesDir = path.join(backendSrc, 'routes');
  if (fs.existsSync(routesDir)) {
    discovered.push({ dirPath: 'backend/src/routes', group: 'Core Routes', label: 'Routes' });
    const routeSubs = fs.readdirSync(routesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const sub of routeSubs) {
      discovered.push({
        dirPath: `backend/src/routes/${sub}`,
        group: 'Core Routes',
        label: sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, ' '),
      });
    }
  }

  if (fs.existsSync(frontendSrc)) {
    const featureDirs = ['features', 'pages', 'shared', 'core'];
    for (const fd of featureDirs) {
      const fdir = path.join(frontendSrc, 'app', fd);
      if (fs.existsSync(fdir)) {
        const subs = fs.readdirSync(fdir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
        for (const sub of subs) {
          discovered.push({
            dirPath: `frontend/src/app/${fd}/${sub}`,
            group: `Frontend ${fd.charAt(0).toUpperCase() + fd.slice(1)}`,
            label: sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, ' '),
          });
        }
      }
    }
  }

  return discovered;
}

function trackComponent(
  category: string,
  group: string,
  dirPath: string,
  statusLines: string[],
): ComponentTrackingResult {
  const trackedRaw = exec(`git ls-files -- '${dirPath}'`);
  const untrackedRaw = exec(`git ls-files --others --exclude-standard -- '${dirPath}'`);
  const trackedFiles = trackedRaw ? trackedRaw.split('\n').filter(Boolean) : [];
  const untrackedFiles = untrackedRaw ? untrackedRaw.split('\n').filter(Boolean) : [];

  const modifiedCount = statusLines.filter(
    (l) => /^.[MD]/.test(l) && l.slice(3).startsWith(dirPath),
  ).length;
  const stagedCount = statusLines.filter(
    (l) => /^[AMDR]/.test(l) && l.slice(3).startsWith(dirPath),
  ).length;

  const total = trackedFiles.length + untrackedFiles.length;
  let health: 'green' | 'yellow' | 'red' = 'green';
  if (untrackedFiles.length > 10 || modifiedCount > 20) health = 'red';
  else if (untrackedFiles.length > 0 || modifiedCount > 5) health = 'yellow';

  return {
    category,
    group,
    total,
    tracked: trackedFiles.length,
    untracked: untrackedFiles.length,
    modified: modifiedCount,
    staged: stagedCount,
    files: untrackedFiles,
    health,
  };
}

function runTypeCheck(): CodeQualityResult {
  try {
    const output = execSync('pnpm exec tsc --noEmit --pretty false 2>&1 || true', {
      cwd: path.join(REPO_ROOT, 'backend'),
      encoding: 'utf-8',
      timeout: 120_000,
    }).trim();
    const errorLines = output.split('\n').filter((l) => l.includes('error TS'));
    const fileCounts = new Map<string, number>();
    for (const line of errorLines) {
      const match = line.match(/^([^(]+)\(/);
      if (match) {
        const file = match[1].trim();
        fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
      }
    }
    const topErrorFiles = [...fileCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([file, count]) => ({ file, count }));

    return {
      tscErrors: errorLines.length,
      tscOutput: errorLines.slice(0, 20).join('\n'),
      topErrorFiles,
    };
  } catch {
    return { tscErrors: -1, tscOutput: 'TypeScript check could not be executed', topErrorFiles: [] };
  }
}

function computeTrend(current: WorkspaceAuditReport): 'improving' | 'stable' | 'degrading' | 'any' {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return 'any';
    const history: AuditHistoryEntry[] = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    if (history.length < 2) return 'any';
    const prev = history[history.length - 1];
    const currentScore = current.git.untracked + current.git.modified + current.codeQuality.tscErrors;
    const prevScore = prev.untracked + prev.modified + prev.tscErrors;
    if (currentScore < prevScore - 5) return 'improving';
    if (currentScore > prevScore + 5) return 'degrading';
    return 'stable';
  } catch {
    return 'any';
  }
}

function appendHistory(report: WorkspaceAuditReport): void {
  let history: AuditHistoryEntry[] = [];
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch { /* fresh start */ }

  history.push({
    timestamp: report.timestamp,
    status: report.status,
    totalUncommitted: report.git.totalUncommitted,
    untracked: report.git.untracked,
    modified: report.git.modified,
    staged: report.git.staged,
    tscErrors: report.codeQuality.tscErrors,
    healthyCategories: report.componentSummary.healthyCategories,
    warningCategories: report.componentSummary.warningCategories,
    criticalCategories: report.componentSummary.criticalCategories,
  });

  if (history.length > MAX_HISTORY) {
    history = history.slice(history.length - MAX_HISTORY);
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export async function runWorkspaceAudit(): Promise<WorkspaceAuditReport> {
  const startMs = Date.now();
  const alerts: string[] = [];

  const branch = exec('git branch --show-current');
  const lastCommitHash = exec('git log -1 --format=%H');
  const lastCommitMessage = exec('git log -1 --format=%s');
  const lastCommitAge = exec('git log -1 --format=%ar');

  const porcelain = exec('git status --porcelain');
  const statusLines = porcelain ? porcelain.split('\n').filter(Boolean) : [];
  const staged = statusLines.filter((l) => /^[AMDR]/.test(l)).length;
  const modified = statusLines.filter((l) => /^.[MD]/.test(l)).length;
  const untracked = statusLines.filter((l) => l.startsWith('??')).length;
  const deleted = statusLines.filter((l) => /^.D|^D/.test(l)).length;
  const totalUncommitted = statusLines.length;

  const untrackedFiles = statusLines.filter((l) => l.startsWith('??')).map((l) => l.slice(3));
  const modifiedFiles = statusLines.filter((l) => /^.[MD]/.test(l)).map((l) => l.slice(3));
  const stagedFiles = statusLines.filter((l) => /^[AMDR]/.test(l)).map((l) => l.slice(3));

  const diffStatRaw = exec('git diff --stat --stat-count=1 2>/dev/null | tail -1');
  const diffMatch = diffStatRaw.match(/(\d+) files? changed(?:, (\d+) insertions?)?(?:, (\d+) deletions?)?/);
  const diffStat: GitDiffStat = {
    filesChanged: diffMatch ? parseInt(diffMatch[1], 10) : 0,
    insertions: diffMatch && diffMatch[2] ? parseInt(diffMatch[2], 10) : 0,
    deletions: diffMatch && diffMatch[3] ? parseInt(diffMatch[3], 10) : 0,
  };

  const dirs = discoverModuleDirectories();
  const components: ComponentTrackingResult[] = [];
  for (const d of dirs) {
    const label = `${d.group} > ${d.label}`;
    const result = trackComponent(label, d.group, d.dirPath, statusLines);
    if (result.total > 0 || result.untracked > 0) {
      components.push(result);
    }
  }

  components.sort((a, b) => b.untracked - a.untracked || b.modified - a.modified);

  const healthyCategories = components.filter((c) => c.health === 'green').length;
  const warningCategories = components.filter((c) => c.health === 'yellow').length;
  const criticalCategories = components.filter((c) => c.health === 'red').length;
  const totalTracked = components.reduce((s, c) => s + c.tracked, 0);
  const totalUntracked = components.reduce((s, c) => s + c.untracked, 0);
  const totalModified = components.reduce((s, c) => s + c.modified, 0);

  for (const c of components) {
    if (c.health === 'red') {
      alerts.push(`CRITICAL: ${c.category} — ${c.untracked} untracked, ${c.modified} modified`);
    } else if (c.health === 'yellow') {
      alerts.push(`WARNING: ${c.category} — ${c.untracked} untracked, ${c.modified} modified`);
    }
  }

  if (untracked > 50) {
    alerts.push(`CRITICAL: ${untracked} total untracked files in workspace`);
  } else if (untracked > 0) {
    alerts.push(`WARNING: ${untracked} untracked files in workspace`);
  }

  if (staged > 0) {
    alerts.push(`WARNING: ${staged} files staged but NOT committed`);
  }

  if (modified > 100) {
    alerts.push(`CRITICAL: ${modified} modified files not staged — risk of losing work`);
  } else if (modified > 0) {
    alerts.push(`WARNING: ${modified} modified files not staged`);
  }

  const codeQuality = runTypeCheck();
  if (codeQuality.tscErrors > 0) {
    alerts.push(`CODE_QUALITY: ${codeQuality.tscErrors} TypeScript compilation errors`);
  }

  let status: 'clean' | 'warnings' | 'critical' = 'clean';
  if (alerts.some((a) => a.startsWith('CRITICAL'))) {
    status = 'critical';
  } else if (alerts.length > 0) {
    status = 'warnings';
  }

  const report: WorkspaceAuditReport = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    git: {
      branch,
      lastCommitHash,
      lastCommitMessage,
      lastCommitAge,
      staged,
      modified,
      untracked,
      deleted,
      totalUncommitted,
      untrackedFiles,
      modifiedFiles,
      stagedFiles,
      diffStat,
    },
    components,
    componentSummary: {
      totalCategories: components.length,
      healthyCategories,
      warningCategories,
      criticalCategories,
      totalTracked,
      totalUntracked,
      totalModified,
    },
    codeQuality,
    alerts,
    status,
    trend: 'any',
  };

  report.trend = computeTrend(report);

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  fs.writeFileSync(LATEST_FILE, JSON.stringify(report, null, 2));
  appendHistory(report);

  return report;
}

export function getLatestReport(): WorkspaceAuditReport | null {
  try {
    if (!fs.existsSync(LATEST_FILE)) return null;
    return JSON.parse(fs.readFileSync(LATEST_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function getAuditHistory(): AuditHistoryEntry[] {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function printAuditReport(report: WorkspaceAuditReport): void {
  logger.info(`\n${'═'.repeat(70)}`);
  logger.info(`${PREFIX} WORKSPACE AUDIT REPORT — ${report.timestamp}`);
  logger.info(`${'═'.repeat(70)}`);

  logger.info(`\n  Branch: ${report.git.branch}  |  Last commit: ${report.git.lastCommitAge}`);
  logger.info(`  Status: ${report.status.toUpperCase()}  |  Trend: ${report.trend}  |  Duration: ${report.durationMs}ms`);
  logger.info(`  Total uncommitted: ${report.git.totalUncommitted}`);
  logger.info(`    Staged: ${report.git.staged}  |  Modified: ${report.git.modified}  |  Untracked: ${report.git.untracked}  |  Deleted: ${report.git.deleted}`);
  logger.info(`  Diff: +${report.git.diffStat.insertions} -${report.git.diffStat.deletions} in ${report.git.diffStat.filesChanged} files`);

  logger.info(`\n  Components: ${report.componentSummary.totalCategories} categories`);
  logger.info(`    Healthy: ${report.componentSummary.healthyCategories}  |  Warning: ${report.componentSummary.warningCategories}  |  Critical: ${report.componentSummary.criticalCategories}`);
  logger.info(`    Tracked: ${report.componentSummary.totalTracked}  |  Untracked: ${report.componentSummary.totalUntracked}  |  Modified: ${report.componentSummary.totalModified}`);

  const issues = report.components.filter((c) => c.health !== 'green');
  if (issues.length > 0) {
    logger.info(`\n  Component Issues:`);
    for (const c of issues.slice(0, 20)) {
      const icon = c.health === 'red' ? '🔴' : '🟡';
      logger.info(`    ${icon} ${c.category}: ${c.tracked} tracked, ${c.untracked} untracked, ${c.modified} modified`);
    }
  }

  if (report.codeQuality.tscErrors !== 0) {
    logger.info(`\n  TypeScript: ${report.codeQuality.tscErrors} errors`);
    if (report.codeQuality.topErrorFiles.length > 0) {
      for (const f of report.codeQuality.topErrorFiles.slice(0, 5)) {
        logger.info(`    ${f.file}: ${f.count} errors`);
      }
    }
  }

  if (report.alerts.length > 0) {
    logger.info(`\n  Alerts (${report.alerts.length}):`);
    for (const a of report.alerts.slice(0, 15)) {
      logger.info(`    ${a}`);
    }
    if (report.alerts.length > 15) {
      logger.info(`    ... and ${report.alerts.length - 15} more`);
    }
  }

  logger.info(`${'═'.repeat(70)}\n`);
}
