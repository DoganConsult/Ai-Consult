-- ============================================
-- Distributed Tracing Correlation
-- Adds OpenTelemetry trace/span IDs and correlation ID to agent metrics
-- Enables correlation between Langfuse, OpenTelemetry, and request correlation IDs
-- ============================================

-- Add OpenTelemetry trace/span ID columns
ALTER TABLE langgraph_agent_metrics
  ADD COLUMN IF NOT EXISTS otel_trace_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS otel_span_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(255);

-- Add indexes for trace correlation queries
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_otel_trace
  ON langgraph_agent_metrics(otel_trace_id)
  WHERE otel_trace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_otel_span
  ON langgraph_agent_metrics(otel_span_id)
  WHERE otel_span_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_correlation
  ON langgraph_agent_metrics(correlation_id)
  WHERE correlation_id IS NOT NULL;

-- Composite index for cross-system trace lookup
CREATE INDEX IF NOT EXISTS idx_langgraph_metrics_trace_correlation
  ON langgraph_agent_metrics(tenant_id, langsmith_trace_id, otel_trace_id, correlation_id)
  WHERE langsmith_trace_id IS NOT NULL OR otel_trace_id IS NOT NULL OR correlation_id IS NOT NULL;

COMMENT ON COLUMN langgraph_agent_metrics.otel_trace_id IS 'OpenTelemetry trace ID for distributed tracing correlation';
COMMENT ON COLUMN langgraph_agent_metrics.otel_span_id IS 'OpenTelemetry span ID for this agent execution';
COMMENT ON COLUMN langgraph_agent_metrics.correlation_id IS 'Request correlation ID (X-Correlation-ID) for end-to-end request tracing';
