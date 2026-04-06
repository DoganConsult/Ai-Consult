// @ts-nocheck
import { auditMiddleware } from '../middleware/audit';
// ============================================
// Trace Correlation Routes
// Endpoints for querying distributed traces across Langfuse, OpenTelemetry, and correlation IDs
// ============================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../dauth';
import { requirePermission } from '../../../dauth';
import { tenantGuard } from '../guards/tenant-guard';
import { auditMiddleware } from '../middleware/audit';
import { query, tenantSchema } from '../../../../config/database/database';
import { toErrorMessage } from '../../../../errors/http-error.util';
import { getFirstRow } from '../../../../shared/data/db-utils';

const router = Router();
router.use(auditMiddleware('ai'));
router.use(tenantGuard);
router.use(authenticate);
router.use(requirePermission('ai.agent.view'));

export interface TraceCorrelationResult {
  metricId: string;
  agentId: string;
  runId: string;
  startTime: string;
  endTime: string | null;
  durationMs: number;
  status: string;
  // Trace IDs
  langfuseTraceId: string | null;
  otelTraceId: string | null;
  otelSpanId: string | null;
  correlationId: string | null;
  temporalWorkflowId: string | null;
}

/**
 * GET /api/trace-correlation/by-correlation-id/:correlationId
 * Find all agent runs for a given correlation ID (X-Correlation-ID)
 */
router.get('/by-correlation-id/:correlationId', async (req: Request, res: Response) => {
  try {
    const { correlationId } = req.params;
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);

    const result = await query(
      `SELECT
         metric_id,
         agent_id,
         run_id,
         start_time,
         end_time,
         duration_ms,
         status,
         langsmith_trace_id,
         otel_trace_id,
         otel_span_id,
         correlation_id,
         temporal_workflow_id
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND correlation_id = $2
       ORDER BY start_time DESC
       LIMIT 100`,
      [tenantId, correlationId],
    );

    const traces: TraceCorrelationResult[] = result.rows.map((row: any) => ({
      metricId: row.metric_id,
      agentId: row.agent_id,
      runId: row.run_id,
      startTime: row.start_time?.toISOString() || '',
      endTime: row.end_time?.toISOString() || null,
      durationMs: row.duration_ms,
      status: row.status,
      langfuseTraceId: row.langsmith_trace_id,
      otelTraceId: row.otel_trace_id,
      otelSpanId: row.otel_span_id,
      correlationId: row.correlation_id,
      temporalWorkflowId: row.temporal_workflow_id,
    }));

    res.json({ correlationId, traces, count: traces.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

/**
 * GET /api/trace-correlation/by-otel-trace/:otelTraceId
 * Find all agent runs for a given OpenTelemetry trace ID
 */
router.get('/by-otel-trace/:otelTraceId', async (req: Request, res: Response) => {
  try {
    const { otelTraceId } = req.params;
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);

    const result = await query(
      `SELECT
         metric_id,
         agent_id,
         run_id,
         start_time,
         end_time,
         duration_ms,
         status,
         langsmith_trace_id,
         otel_trace_id,
         otel_span_id,
         correlation_id,
         temporal_workflow_id
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND otel_trace_id = $2
       ORDER BY start_time DESC
       LIMIT 100`,
      [tenantId, otelTraceId],
    );

    const traces: TraceCorrelationResult[] = result.rows.map((row: any) => ({
      metricId: row.metric_id,
      agentId: row.agent_id,
      runId: row.run_id,
      startTime: row.start_time?.toISOString() || '',
      endTime: row.end_time?.toISOString() || null,
      durationMs: row.duration_ms,
      status: row.status,
      langfuseTraceId: row.langsmith_trace_id,
      otelTraceId: row.otel_trace_id,
      otelSpanId: row.otel_span_id,
      correlationId: row.correlation_id,
      temporalWorkflowId: row.temporal_workflow_id,
    }));

    res.json({ otelTraceId, traces, count: traces.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

/**
 * GET /api/trace-correlation/by-langfuse-trace/:langfuseTraceId
 * Find all agent runs for a given Langfuse trace ID
 */
router.get('/by-langfuse-trace/:langfuseTraceId', async (req: Request, res: Response) => {
  try {
    const { langfuseTraceId } = req.params;
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);

    const result = await query(
      `SELECT
         metric_id,
         agent_id,
         run_id,
         start_time,
         end_time,
         duration_ms,
         status,
         langsmith_trace_id,
         otel_trace_id,
         otel_span_id,
         correlation_id,
         temporal_workflow_id
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND langsmith_trace_id = $2
       ORDER BY start_time DESC
       LIMIT 100`,
      [tenantId, langfuseTraceId],
    );

    const traces: TraceCorrelationResult[] = result.rows.map((row: any) => ({
      metricId: row.metric_id,
      agentId: row.agent_id,
      runId: row.run_id,
      startTime: row.start_time?.toISOString() || '',
      endTime: row.end_time?.toISOString() || null,
      durationMs: row.duration_ms,
      status: row.status,
      langfuseTraceId: row.langsmith_trace_id,
      otelTraceId: row.otel_trace_id,
      otelSpanId: row.otel_span_id,
      correlationId: row.correlation_id,
      temporalWorkflowId: row.temporal_workflow_id,
    }));

    res.json({ langfuseTraceId, traces, count: traces.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

/**
 * GET /api/trace-correlation/by-run-id/:runId
 * Get trace correlation for a specific agent run
 */
router.get('/by-run-id/:runId', async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);

    const result = await query(
      `SELECT
         metric_id,
         agent_id,
         run_id,
         start_time,
         end_time,
         duration_ms,
         status,
         langsmith_trace_id,
         otel_trace_id,
         otel_span_id,
         correlation_id,
         temporal_workflow_id
       FROM "${schema}".langgraph_agent_metrics
       WHERE tenant_id = $1 AND run_id = $2
       LIMIT 1`,
      [tenantId, runId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const row = getFirstRow(result);
    const trace: TraceCorrelationResult = {
      metricId: row.metric_id,
      agentId: row.agent_id,
      runId: row.run_id,
      startTime: row.start_time?.toISOString() || '',
      endTime: row.end_time?.toISOString() || null,
      durationMs: row.duration_ms,
      status: row.status,
      langfuseTraceId: row.langsmith_trace_id,
      otelTraceId: row.otel_trace_id,
      otelSpanId: row.otel_span_id,
      correlationId: row.correlation_id,
      temporalWorkflowId: row.temporal_workflow_id,
    };

    res.json({ trace });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
