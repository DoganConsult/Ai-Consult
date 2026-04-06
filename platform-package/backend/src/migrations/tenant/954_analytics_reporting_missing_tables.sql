-- ============================================================
-- Migration 954: Analytics + Reporting — Missing Tables (MP-12, MP-11)
-- Owner: Module:Analytics, Module:Reporting
-- Tables: 16 new tables (8 analytics + 8 reporting)
-- ============================================================

-- ═══ ANALYTICS (MP-12) ═══

CREATE TABLE IF NOT EXISTS analytics_dashboards (
  dashboard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, layout JSONB DEFAULT '{}',
  owner_user_id VARCHAR(64), is_shared BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS analytics_widgets (
  widget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES analytics_dashboards(dashboard_id) ON DELETE CASCADE,
  widget_type VARCHAR(50) CHECK (widget_type IN ('chart','table','metric','heatmap','treemap','timeline','gauge','map')),
  title VARCHAR(500) NOT NULL, config JSONB NOT NULL DEFAULT '{}',
  data_source VARCHAR(200), refresh_interval_seconds INT DEFAULT 300,
  position JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS analytics_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_code VARCHAR(100) UNIQUE, metric_name VARCHAR(500) NOT NULL,
  description TEXT, calculation_formula TEXT,
  data_source VARCHAR(200), unit VARCHAR(50),
  aggregation_type VARCHAR(30) DEFAULT 'sum' CHECK (aggregation_type IN ('sum','avg','count','min','max','latest','percentile')),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS analytics_datasets (
  dataset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_code VARCHAR(100) UNIQUE, dataset_name VARCHAR(500) NOT NULL,
  source_type VARCHAR(50) CHECK (source_type IN ('table','query','api','aggregation','calculated')),
  source_config JSONB NOT NULL DEFAULT '{}',
  refresh_schedule VARCHAR(50) DEFAULT 'daily',
  last_refreshed_at TIMESTAMPTZ, row_count BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS analytics_queries (
  query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name VARCHAR(500) NOT NULL, query_text TEXT NOT NULL,
  parameters JSONB DEFAULT '[]', dataset_id UUID REFERENCES analytics_datasets(dataset_id),
  is_saved BOOLEAN DEFAULT FALSE, last_run_at TIMESTAMPTZ,
  avg_execution_ms INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID REFERENCES analytics_metrics(metric_id),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value NUMERIC(15,4), previous_value NUMERIC(15,4),
  change_percent NUMERIC(8,2), trend VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_refresh_schedules (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES analytics_datasets(dataset_id),
  metric_id UUID REFERENCES analytics_metrics(metric_id),
  cron_expression VARCHAR(100), frequency VARCHAR(30) DEFAULT 'daily',
  is_active BOOLEAN DEFAULT TRUE, last_run_at TIMESTAMPTZ, next_run_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_cache (
  cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(500) NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ REPORTING (MP-11) ═══

CREATE TABLE IF NOT EXISTS reporting_definitions (
  definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, report_type VARCHAR(50) DEFAULT 'standard'
    CHECK (report_type IN ('standard','regulatory','board','executive','operational','custom')),
  template_id UUID, data_sources JSONB DEFAULT '[]',
  parameters JSONB DEFAULT '[]', output_formats JSONB DEFAULT '["pdf","xlsx"]',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS reporting_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) UNIQUE, template_name VARCHAR(500) NOT NULL,
  layout JSONB NOT NULL DEFAULT '{}', sections JSONB DEFAULT '[]',
  header_config JSONB DEFAULT '{}', footer_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS reporting_schedules (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID REFERENCES reporting_definitions(definition_id),
  cron_expression VARCHAR(100), frequency VARCHAR(30) DEFAULT 'monthly',
  recipients JSONB DEFAULT '[]', delivery_method VARCHAR(30) DEFAULT 'email',
  is_active BOOLEAN DEFAULT TRUE, next_run_at TIMESTAMPTZ, last_run_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS reporting_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID REFERENCES reporting_definitions(definition_id),
  schedule_id UUID REFERENCES reporting_schedules(schedule_id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parameters_used JSONB DEFAULT '{}', row_count INT DEFAULT 0,
  file_url VARCHAR(2000), file_format VARCHAR(20) DEFAULT 'pdf',
  file_size_bytes BIGINT,
  status VARCHAR(30) DEFAULT 'generated' CHECK (status IN ('generating','generated','distributed','failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting_exports (
  export_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES reporting_snapshots(snapshot_id),
  export_format VARCHAR(20) NOT NULL, file_url VARCHAR(2000),
  exported_by VARCHAR(64), exported_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporting_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID REFERENCES reporting_definitions(definition_id),
  user_id VARCHAR(64) NOT NULL,
  delivery_method VARCHAR(30) DEFAULT 'email' CHECK (delivery_method IN ('email','in_app','both')),
  frequency VARCHAR(30) DEFAULT 'on_generation',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (definition_id, user_id)
);

CREATE TABLE IF NOT EXISTS reporting_dashboards (
  dashboard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  report_definitions JSONB DEFAULT '[]', layout JSONB DEFAULT '{}',
  is_shared BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS reporting_widgets (
  widget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES reporting_dashboards(dashboard_id) ON DELETE CASCADE,
  definition_id UUID REFERENCES reporting_definitions(definition_id),
  widget_type VARCHAR(50), title VARCHAR(500), config JSONB DEFAULT '{}',
  position JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_active ON analytics_dashboards (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_code ON analytics_metrics (metric_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_metric ON analytics_snapshots (metric_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON analytics_snapshots (snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_reporting_defs_active ON reporting_definitions (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reporting_schedules_active ON reporting_schedules (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reporting_snapshots_def ON reporting_snapshots (definition_id);
CREATE INDEX IF NOT EXISTS idx_reporting_subs_def ON reporting_subscriptions (definition_id);
CREATE INDEX IF NOT EXISTS idx_reporting_subs_user ON reporting_subscriptions (user_id);
