// @ts-nocheck
/**
 * Barrel module that aggregates all job definitions.
 *
 * Platform jobs live here. Product jobs register via product bootstrap hooks.
 */
import { JobDefinition } from './job-types';
import { getSlaEscalationJobs } from './sla-escalation-jobs';
import { getOperationalJobs } from './operational-jobs';
import { getWorkspaceAuditJobs } from './workspace-audit-jobs';
import { getAiAnalysisJobs } from './ai-analysis-jobs';
import { getCertificationHealthJobs } from './certification-health-jobs';
import { getIdentityLifecycleJobs } from './identity-lifecycle-jobs';

import { getInfrastructureJobs } from './infrastructure-jobs';

export async function getPlatformJobDefinitions(): Promise<JobDefinition[]> {
  const [sla, operational, workspaceAudit, aiAnalysis, certHealth, identityLifecycle, agent, infra] = await Promise.all([
    getSlaEscalationJobs(),
    getOperationalJobs(),
    getWorkspaceAuditJobs(),
    getAiAnalysisJobs(),
    getCertificationHealthJobs(),
    getIdentityLifecycleJobs(),
    getAgentJobs(),
    getInfrastructureJobs(),
  ]);
  return [...sla, ...operational, ...workspaceAudit, ...aiAnalysis, ...certHealth, ...identityLifecycle, ...agent, ...infra];
}

export async function getAllJobDefinitions(): Promise<JobDefinition[]> {
  return getPlatformJobDefinitions();
}

export type { JobDefinition } from './job-types';
