import { describe, it, expect } from 'vitest';
import { EVENT_CATALOG, validateEventPayload } from '../event-catalog';

const BASE = { tenantId: 'tenant-1', severity: 'info' as const };

describe('event-catalog — registry completeness', () => {
  const expectedTypes = [
    'control.failed', 'audit.finding_created', 'risk.exceeded_appetite',
    'incident.created', 'incident.escalated', 'evidence.expired',
    'entity.state_changed', 'constitution.breach', 'policy.violated',
    'vendor.risk_changed', 'agent.escalation',
    'security.vulnerability_detected', 'ethics.report_created',
    'workflow.started', 'workflow.step_entered', 'workflow.task_created',
    'workflow.task_assigned', 'workflow.task_completed',
    'workflow.approved', 'workflow.rejected', 'workflow.escalated',
    'workflow.completed', 'workflow.cancelled', 'workflow.reassigned',
    'approval.submitted', 'approval.completed',
    'approval.rejected', 'approval.escalated',
    'lifecycle.state_changed',
    'process_task.created', 'process_task.unassigned',
    'notification.created', 'notification.delivered',
  ];

  it('catalog contains all 33 expected event types', () => {
    for (const t of expectedTypes) {
      expect(EVENT_CATALOG).toHaveProperty(t);
    }
    expect(Object.keys(EVENT_CATALOG).length).toBeGreaterThanOrEqual(33);
  });
});

describe('event-catalog — workflow event validation', () => {
  it('workflow.started accepts valid payload', () => {
    const r = validateEventPayload('workflow.started', {
      ...BASE,
      eventType: 'workflow.started',
      payload: { instanceId: 'wf-1', triggeredBy: 'user-1' },
    });
    expect(r.success).toBe(true);
  });

  it('workflow.approved accepts valid payload', () => {
    const r = validateEventPayload('workflow.approved', {
      ...BASE,
      eventType: 'workflow.approved',
      payload: { instanceId: 'wf-1', triggeredBy: 'approver-1', requestId: 'req-1' },
    });
    expect(r.success).toBe(true);
  });

  it('workflow event rejects missing tenantId', () => {
    const r = validateEventPayload('workflow.started', {
      eventType: 'workflow.started',
      payload: { instanceId: 'wf-1' },
    });
    expect(r.success).toBe(false);
    expect(r.errors).toBeDefined();
  });
});

describe('event-catalog — approval event validation', () => {
  it('approval.submitted accepts valid payload', () => {
    const r = validateEventPayload('approval.submitted', {
      ...BASE,
      eventType: 'approval.submitted',
      payload: { requestId: 'req-1', chainId: 'chain-1', submittedBy: 'user-1' },
    });
    expect(r.success).toBe(true);
  });

  it('approval.submitted rejects missing requestId', () => {
    const r = validateEventPayload('approval.submitted', {
      ...BASE,
      eventType: 'approval.submitted',
      payload: { chainId: 'chain-1' },
    });
    expect(r.success).toBe(false);
  });

  it('approval.rejected accepts valid payload', () => {
    const r = validateEventPayload('approval.rejected', {
      ...BASE,
      eventType: 'approval.rejected',
      payload: { requestId: 'req-1', rejectedBy: 'u1', reason: 'Incomplete', step: 2 },
    });
    expect(r.success).toBe(true);
  });
});

describe('event-catalog — lifecycle event validation', () => {
  it('lifecycle.state_changed accepts valid payload', () => {
    const r = validateEventPayload('lifecycle.state_changed', {
      ...BASE,
      eventType: 'lifecycle.state_changed',
      payload: {
        entityType: 'control', entityId: 'ctrl-1',
        fromState: 'draft', toState: 'active',
        moduleCode: 'compliance', actor: 'user-1',
      },
    });
    expect(r.success).toBe(true);
  });

  it('lifecycle.state_changed rejects missing entityType', () => {
    const r = validateEventPayload('lifecycle.state_changed', {
      ...BASE,
      eventType: 'lifecycle.state_changed',
      payload: { entityId: 'ctrl-1', fromState: 'draft', toState: 'active' },
    });
    expect(r.success).toBe(false);
  });
});

describe('event-catalog — process task event validation', () => {
  it('process_task.created accepts valid payload', () => {
    const r = validateEventPayload('process_task.created', {
      ...BASE,
      eventType: 'process_task.created',
      payload: { taskId: 'task-1', taskType: 'review', priority: 'high', assignedUserId: 'user-1', routingTier: 'T2' },
    });
    expect(r.success).toBe(true);
  });

  it('process_task.created rejects missing taskId', () => {
    const r = validateEventPayload('process_task.created', {
      ...BASE,
      eventType: 'process_task.created',
      payload: { taskType: 'review' },
    });
    expect(r.success).toBe(false);
  });

  it('process_task.unassigned accepts valid payload', () => {
    const r = validateEventPayload('process_task.unassigned', {
      ...BASE,
      eventType: 'process_task.unassigned',
      payload: { taskId: 'task-2', priority: 'critical' },
    });
    expect(r.success).toBe(true);
  });
});

describe('event-catalog — notification event validation', () => {
  it('notification.created accepts valid payload', () => {
    const r = validateEventPayload('notification.created', {
      ...BASE,
      eventType: 'notification.created',
      payload: { userId: 'user-1', type: 'task_assigned' },
    });
    expect(r.success).toBe(true);
  });

  it('notification.created rejects missing userId', () => {
    const r = validateEventPayload('notification.created', {
      ...BASE,
      eventType: 'notification.created',
      payload: { type: 'task_assigned' },
    });
    expect(r.success).toBe(false);
  });
});

describe('event-catalog — unknown event type', () => {
  it('rejects unregistered event type', () => {
    const r = validateEventPayload('unknown.event', { ...BASE, eventType: 'unknown.event' });
    expect(r.success).toBe(false);
    expect(r.errors?.[0]).toContain('Unknown event type');
  });
});
