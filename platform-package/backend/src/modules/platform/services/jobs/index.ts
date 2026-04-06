// @ts-nocheck
import { logger } from '../../../../platform/dos/observability/logger.service';
import type { JobDefinition } from '../../jobs/misc/job-types';

type JobFactory = () => Promise<JobDefinition[]>;

const JOB_MODULES: Array<{ name: string; loader: () => Promise<{ [k: string]: JobFactory }> }> = [
  { name: 'agent', loader: () => import('../../jobs/misc/agent-jobs') },
  { name: 'audit', loader: () => import('../../jobs/misc/audit-jobs') },
  { name: 'compliance', loader: () => import('../../jobs/misc/compliance-jobs') },
  { name: 'governance', loader: () => import('../../jobs/misc/governance-jobs') },
  { name: 'grc-engine', loader: () => import('../../jobs/misc/grc-engine-jobs') },
  { name: 'sla-escalation', loader: () => import('../../jobs/misc/sla-escalation-jobs') },
  { name: 'vendor-bcp', loader: () => import('../../jobs/misc/vendor-bcp-jobs') },
  { name: 'operational-analytics', loader: () => import('../../jobs/operational/operational-analytics-jobs') },
  { name: 'operational-compliance', loader: () => import('../../jobs/operational/operational-compliance-jobs') },
  { name: 'operational-security', loader: () => import('../../jobs/operational/operational-security-jobs') },
  { name: 'operational-subscription', loader: () => import('../../jobs/operational/operational-subscription-jobs') },
  { name: 'operational-provisioning', loader: () => import('../../jobs/operational/operational-provisioning-jobs') },
  { name: 'operational-training', loader: () => import('../../jobs/operational/operational-training-jobs') },
  { name: 'operational-workflow', loader: () => import('../../jobs/operational/operational-workflow-jobs') },
  { name: 'operational-governance', loader: () => import('../../jobs/operational/operational-governance-jobs') },
  { name: 'operational-access-control', loader: () => import('../../jobs/operational/operational-access-control-jobs') },
  { name: 'operational-other', loader: () => import('../../jobs/operational/operational-other-jobs') },
  { name: 'workspace-audit', loader: () => import('../../jobs/misc/workspace-audit-jobs') },
  { name: 'evidence', loader: () => import('../../jobs/misc/evidence-jobs') },
  {
    name: 'platform-backup',
    loader: async () => ({
      getPlatformBackupJobs: async (): Promise<JobDefinition[]> => {
        const { runTenantBackup } = await import('./backup.job');
        return [{
          name: 'platform-nightly-backup',
          cron: '0 1 * * *', // daily at 01:00
          handler: runTenantBackup,
        }];
      },
    }),
  },
];

export async function getAllJobDefinitions(): Promise<JobDefinition[]> {
  const all: JobDefinition[] = [];

  for (const { name, loader } of JOB_MODULES) {
    try {
      const mod = await loader();
      const factoryFn = Object.values(mod).find(
        (v): v is JobFactory => typeof v === 'function',
      );
      if (factoryFn) {
        const jobs = await factoryFn();
        all.push(...jobs);
      }
    } catch (err) {
      logger.warn(`[JobRegistry] Failed to load ${name} jobs:`, err);
    }
  }

  return all;
}
