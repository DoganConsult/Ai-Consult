// @ts-nocheck
import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import type { AuthenticatedRequest } from '../../../../types/express.types';
import {
  getAgentAdminView,
  getPlatformAdminOverview,
  executeAdminAction,
  getAgentIncidents,
  getAgentRollbackHistory,
} from './agent-admin.service';
import { getAllAgentDefinitions, getAgentDefinition } from '../registry/agent-registry.service';
import { getRunHistory, getRunById } from '../runtime/agent-runtime.service';
import { getTasksByAgent, getTaskById } from '../tasks/agent-task.service';
import { getPendingApprovals, resolveApproval } from '../approvals/agent-approval.service';
import { getAgentDiagnostics, getPlatformDiagnostics } from '../diagnostics/agent-diagnostics.service';
import { checkAgentHealth, getAllAgentHealth } from '../health/agent-health.service';
import { getAgentDirectory, getAgentDirectoryDetail } from './agent-directory.service';
import { runWatchdogSweep, getWatchdogHistory } from '../health/kernel-watchdog.service';
import { transitionAgentState, getValidTransitions, bulkTransition } from '../lifecycle/agent-lifecycle.service';
import { runMemoryGc } from '../memory/agent-memory-gc.service';
import { getMemoryStats } from '../memory/agent-memory.service';
import { getBudgetSnapshot } from '../policies/agent-budget-guard.service';
import { queryKernelAuditLog, getKernelAuditSummary } from '../diagnostics/kernel-audit-log.service';
import type { AgentAdminAction, AgentState } from '../contracts/agent.types';

const router: Router = Router();

function extractAuth(req: Request): { userId: string; tenantId: string } | null {
  const ar = req as AuthenticatedRequest;
  const userId = ar.user?.userId || (req.headers['x-user-id'] as string);
  const tenantId = ar.tenantId || ar.user?.tenantId || (req.headers['x-tenant-id'] as string);
  if (!userId || !tenantId) return null;
  return { userId: String(userId), tenantId: String(tenantId) };
}

router.get('/registry', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const defs = getAllAgentDefinitions();
  return res.json({ agents: defs });
});

router.get('/registry/:agentCode', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const def = getAgentDefinition(req.params.agentCode);
  if (!def) return res.status(404).json({ error: 'agent_not_found' });
  return res.json(def);
});

router.get('/overview', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  try {
    const overview = await getPlatformAdminOverview(auth.tenantId);
    return res.json(overview);
  } catch (err) {
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/:agentCode/admin', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  try {
    const view = await getAgentAdminView(auth.tenantId, req.params.agentCode);
    return res.json(view);
  } catch (err) {
    return res.status(500).json({ error: 'internal_error' });
  }
});

router.get('/:agentCode/runs', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const limit = parseInt(req.query.limit as string) || 50;
  const runs = await getRunHistory(auth.tenantId, req.params.agentCode, limit);
  return res.json({ runs });
});

router.get('/runs/:runId', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const run = await getRunById(auth.tenantId, req.params.runId);
  if (!run) return res.status(404).json({ error: 'run_not_found' });
  return res.json(run);
});

router.get('/:agentCode/tasks', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const status = req.query.status as string | undefined;
  const tasks = await getTasksByAgent(auth.tenantId, req.params.agentCode, status);
  return res.json({ tasks });
});

router.get('/tasks/:taskId', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const task = await getTaskById(auth.tenantId, req.params.taskId);
  if (!task) return res.status(404).json({ error: 'task_not_found' });
  return res.json(task);
});

router.get('/approvals/pending', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const limit = parseInt(req.query.limit as string) || 50;
  const approvals = await getPendingApprovals(auth.tenantId, limit);
  return res.json({ approvals });
});

router.post('/approvals/:approvalId/resolve', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const { decision, reason } = req.body;
  if (!decision || !['approved', 'denied'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be approved or denied' });
  }
  const result = await resolveApproval(auth.tenantId, req.params.approvalId, decision, auth.userId, reason);
  if (!result) return res.status(404).json({ error: 'approval_not_found_or_already_resolved' });
  return res.json(result);
});

router.get('/:agentCode/diagnostics', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const diagnostics = await getAgentDiagnostics(auth.tenantId, req.params.agentCode);
  return res.json(diagnostics);
});

router.get('/diagnostics/platform', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const diagnostics = await getPlatformDiagnostics(auth.tenantId);
  return res.json(diagnostics);
});

router.get('/:agentCode/health', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const health = await checkAgentHealth(auth.tenantId, req.params.agentCode);
  return res.json(health);
});

router.get('/health/all', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const health = await getAllAgentHealth(auth.tenantId);
  return res.json({ agents: health });
});

router.get('/:agentCode/incidents', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const incidents = await getAgentIncidents(auth.tenantId, req.params.agentCode);
  return res.json({ incidents });
});

router.get('/:agentCode/rollback-history', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const history = await getAgentRollbackHistory(auth.tenantId, req.params.agentCode);
  return res.json({ history });
});

router.post('/admin/action', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const action: AgentAdminAction = {
    ...req.body,
    tenantId: auth.tenantId,
    performedBy: auth.userId,
  };
  const result = await executeAdminAction(auth.tenantId, action);
  return res.json(result);
});

router.post('/watchdog/sweep', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  try {
    const result = await runWatchdogSweep(auth.tenantId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'watchdog_sweep_failed' });
  }
});

router.get('/watchdog/history', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const limit = parseInt(req.query.limit as string) || 20;
  const history = await getWatchdogHistory(auth.tenantId, limit);
  return res.json({ history });
});

router.post('/:agentCode/lifecycle/transition', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const { targetState, reason } = req.body;
  if (!targetState) return res.status(400).json({ error: 'targetState required' });
  const result = await transitionAgentState(auth.tenantId, req.params.agentCode, targetState as AgentState, auth.userId, reason || '');
  if (!result.success) return res.status(409).json(result);
  return res.json(result);
});

router.get('/:agentCode/lifecycle/transitions', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const def = getAgentDefinition(req.params.agentCode);
  if (!def) return res.status(404).json({ error: 'agent_not_found' });
  const currentState = (await import('../registry/agent-registry.service')).getAgentState;
  const state = await currentState(auth.tenantId, req.params.agentCode);
  return res.json({ currentState: state, validTransitions: getValidTransitions(state) });
});

router.post('/lifecycle/bulk-transition', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const { agentCodes, targetState, reason } = req.body;
  if (!agentCodes?.length || !targetState) return res.status(400).json({ error: 'agentCodes and targetState required' });
  const results = await bulkTransition(auth.tenantId, agentCodes, targetState as AgentState, auth.userId, reason || '');
  return res.json({ results });
});

router.post('/memory/gc', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  try {
    const result = await runMemoryGc(auth.tenantId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'memory_gc_failed' });
  }
});

router.get('/:agentCode/memory/stats', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const stats = await getMemoryStats(auth.tenantId, req.params.agentCode);
  return res.json(stats);
});

router.get('/budget/snapshot', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const agentCode = req.query.agentCode as string | undefined;
  const snapshot = await getBudgetSnapshot(auth.tenantId, agentCode);
  return res.json(snapshot);
});

router.get('/audit-log', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const filters = {
    category: req.query.category as string | undefined,
    agentCode: req.query.agentCode as string | undefined,
    severity: req.query.severity as string | undefined,
    since: req.query.since as string | undefined,
    limit: parseInt(req.query.limit as string) || 100,
  };
  const entries = await queryKernelAuditLog(auth.tenantId, filters);
  return res.json({ entries });
});

router.get('/audit-log/summary', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  const hoursBack = parseInt(req.query.hoursBack as string) || 24;
  const summary = await getKernelAuditSummary(auth.tenantId, hoursBack);
  return res.json(summary);
});

router.get('/directory', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  try {
    const directory = await getAgentDirectory(auth.tenantId);
    return res.json(directory);
  } catch (err) {
    return res.status(500).json({ error: 'directory_failed' });
  }
});

router.get('/directory/:agentCode', authenticate, async (req: Request, res: Response) => {
  const auth = extractAuth(req);
  if (!auth) return res.status(401).json({ error: 'unauthorized' });
  try {
    const detail = await getAgentDirectoryDetail(auth.tenantId, req.params.agentCode);
    if (!detail) return res.status(404).json({ error: 'agent_not_found' });
    return res.json(detail);
  } catch (err) {
    return res.status(500).json({ error: 'directory_detail_failed' });
  }
});

export const agentRouter = router;