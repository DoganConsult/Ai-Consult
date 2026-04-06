// @ts-nocheck
import { logger } from '../../../../../platform/dos/observability/logger.service';
import { JobDefinition } from '../job-types';
import { toErrorMessage } from '../../../../../errors/http-error.util';

export async function getWorkspaceAuditJobs(): Promise<JobDefinition[]> {
  return [
    {
      name: 'workspace-audit-tracker',
      cron: '*/10 * * * *',
      description: 'Audits workspace for untracked, uncommitted, and unreviewed files; validates code quality; tracks Temporal, LangGraph, workers, agents, and all platform components',
      handler: async () => {
        logger.info("[Job] workspace-audit-tracker executed");
        try {
          const { runWorkspaceAudit, printAuditReport } = await import('../../services/workspace/workspace-audit.service');
          const report = await runWorkspaceAudit();
          printAuditReport(report);

          if (report.status === 'critical') {
            logger.error(`[Job] workspace-audit-tracker: CRITICAL — ${report.alerts.filter(a => a.startsWith('CRITICAL')).join('; ')}`);
          }

          if (report.git.untracked > 0) {
            logger.warn(`[Job] workspace-audit-tracker: ${report.git.untracked} untracked files require attention`);
          }

          if (report.git.staged > 0) {
            logger.warn(`[Job] workspace-audit-tracker: ${report.git.staged} staged files awaiting commit`);
          }

          const untrackedComponents = report.components.filter(c => c.untracked > 0);
          if (untrackedComponents.length > 0) {
            logger.warn(`[Job] workspace-audit-tracker: ${untrackedComponents.length} component categories have untracked files`);
            for (const c of untrackedComponents) {
              logger.warn(`  → ${c.category}: ${c.untracked} untracked`);
            }
          }

          try {
            const { safeQuery } = await import('../../../../../config/database/database');
            await safeQuery(
              `INSERT INTO job_executions_meta (job_name, meta)
               VALUES ($1, $2)
               ON CONFLICT (job_name) DO UPDATE SET meta = $2, updated_at = NOW()`,
              ['workspace-audit-tracker', JSON.stringify({
                status: report.status,
                untracked: report.git.untracked,
                staged: report.git.staged,
                modified: report.git.modified,
                totalUncommitted: report.git.totalUncommitted,
                tscErrors: report.codeQuality.tscErrors,
                alertCount: report.alerts.length,
                componentIssues: untrackedComponents.length,
              })],
            );
          } catch {
            // DB meta table may not exist — non-fatal
          }
        } catch (err: unknown) {
          logger.error("[Job] workspace-audit-tracker error:", toErrorMessage(err));
        }
      },
    },
  ];
}
