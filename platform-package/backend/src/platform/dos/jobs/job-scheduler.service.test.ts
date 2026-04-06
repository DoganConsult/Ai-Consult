/**
 * Co-located tests for job-scheduler.service.ts
 * Tests type contracts and exported interface shapes.
 * DB/Redis-dependent scheduling requires integration tests.
 */
import { describe, it, expect } from 'vitest';
import type { JobConfig, JobInfo, JobExecution } from './job-scheduler.service';

describe('job-scheduler.service — type contracts', () => {
  it('JobConfig requires name, cronExpression, and enabled', () => {
    const config: JobConfig = {
      name: 'evidence-request-generator',
      cronExpression: '0 4 * * *',
      enabled: true,
      description: 'Generate daily evidence requests',
    };

    expect(config.name).toBe('evidence-request-generator');
    expect(config.enabled).toBe(true);
  });

  it('JobInfo includes execution tracking fields', () => {
    const info: JobInfo = {
      job_name: 'agent-inference-runner',
      cron_expression: '0 * * * *',
      enabled: true,
      last_run_at: '2026-03-01T00:00:00Z',
      last_status: 'success',
      last_error: null,
      next_run_at: '2026-03-01T01:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    };

    expect(info.last_status).toBe('success');
    expect(info.last_error).toBeNull();
  });

  it('JobExecution tracks duration and error state', () => {
    const success: JobExecution = {
      execution_id: 'exec-001',
      job_name: 'process-task-monitor',
      started_at: '2026-03-01T00:00:00Z',
      completed_at: '2026-03-01T00:00:05Z',
      status: 'success',
      duration_ms: 5000,
      error_message: null,
    };

    expect(success.duration_ms).toBe(5000);
    expect(success.error_message).toBeNull();

    const failure: JobExecution = {
      ...success,
      status: 'failed',
      error_message: 'Connection timeout',
    };

    expect(failure.status).toBe('failed');
    expect(failure.error_message).toBeTruthy();
  });
});
