-- Migration: 082_cross_tenant_benchmark_aggregator.sql
-- Cross-tenant benchmark aggregator with opt-in mechanism
-- Stores aggregated benchmark metrics and percentile distributions
-- Date: 2026-03-20

-- ═══════════════════════════════════════════════════════════════
-- Cross-Tenant Benchmark Aggregations (Master Schema)
-- ═══════════════════════════════════════════════════════════════

-- Benchmark aggregation runs (one per job execution)
CREATE TABLE IF NOT EXISTS public.benchmark_aggregation_runs (
    run_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_date            DATE NOT NULL DEFAULT CURRENT_DATE,
    run_timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_count        INT NOT NULL DEFAULT 0,
    metrics_computed    JSONB NOT NULL DEFAULT '{}',
    status              VARCHAR(20) NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('running', 'completed', 'failed', 'partial')),
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (run_date)
);
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_date 
    ON public.benchmark_aggregation_runs (run_date DESC);
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_status 
    ON public.benchmark_aggregation_runs (status, run_timestamp DESC);

-- Aggregated benchmark metrics (percentiles and statistics)
CREATE TABLE IF NOT EXISTS public.benchmark_aggregated_metrics (
    metric_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID NOT NULL REFERENCES public.benchmark_aggregation_runs(run_id) ON DELETE CASCADE,
    metric_name         VARCHAR(50) NOT NULL
                        CHECK (metric_name IN ('compliance_score', 'risk_score', 'evidence_coverage', 
                                               'remediation_closure_rate', 'vendor_health_score', 
                                               'vendor_risk_exposure')),
    sample_size         INT NOT NULL DEFAULT 0,
    mean_value          DECIMAL(10,2),
    median_value        DECIMAL(10,2),
    std_deviation       DECIMAL(10,2),
    min_value           DECIMAL(10,2),
    max_value           DECIMAL(10,2),
    p25                 DECIMAL(10,2),
    p50                 DECIMAL(10,2),
    p75                 DECIMAL(10,2),
    p90                 DECIMAL(10,2),
    p95                 DECIMAL(10,2),
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (run_id, metric_name)
);
CREATE INDEX IF NOT EXISTS idx_benchmark_metrics_run 
    ON public.benchmark_aggregated_metrics (run_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_benchmark_metrics_name 
    ON public.benchmark_aggregated_metrics (metric_name, computed_at DESC);

-- Industry/sector breakdowns (optional filtering dimension)
CREATE TABLE IF NOT EXISTS public.benchmark_sector_metrics (
    sector_metric_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id              UUID NOT NULL REFERENCES public.benchmark_aggregation_runs(run_id) ON DELETE CASCADE,
    sector              VARCHAR(100) NOT NULL,
    metric_name         VARCHAR(50) NOT NULL,
    sample_size         INT NOT NULL DEFAULT 0,
    mean_value          DECIMAL(10,2),
    median_value        DECIMAL(10,2),
    p25                 DECIMAL(10,2),
    p50                 DECIMAL(10,2),
    p75                 DECIMAL(10,2),
    p90                 DECIMAL(10,2),
    p95                 DECIMAL(10,2),
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (run_id, sector, metric_name)
);
CREATE INDEX IF NOT EXISTS idx_benchmark_sector_metrics_run 
    ON public.benchmark_sector_metrics (run_id, sector, metric_name);

-- ═══════════════════════════════════════════════════════════════
-- Tenant Opt-In Preference (uses existing tenant_settings)
-- Key: 'benchmark.opt_in' (value: 'true' or 'false')
-- ═══════════════════════════════════════════════════════════════

-- Note: Opt-in is stored in tenant_settings table with key 'benchmark.opt_in'
-- No additional table needed for opt-in preferences
