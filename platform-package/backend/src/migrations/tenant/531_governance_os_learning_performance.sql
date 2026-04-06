-- ============================================================
-- Migration 376: Governance OS Learning Engine Performance
-- Performance indexes, materialized views, and optimizations
-- ============================================================

-- ═══════════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════

-- Case memory indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_case_memory_tenant_created_desc 
  ON os_case_memory(tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_case_memory_tenant_type_created 
  ON os_case_memory(tenant_id, case_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_memory_effectiveness_range 
  ON os_case_memory(tenant_id, effectiveness_score) 
  WHERE effectiveness_score IS NOT NULL AND effectiveness_score < 0.5;

CREATE INDEX IF NOT EXISTS idx_case_memory_observed_pending 
  ON os_case_memory(tenant_id, created_at) 
  WHERE observed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_case_memory_owner_department 
  ON os_case_memory(tenant_id, owner_id, department_id) 
  WHERE owner_id IS NOT NULL;

-- Pattern signals indexes
CREATE INDEX IF NOT EXISTS idx_pattern_signals_tenant_type_time 
  ON os_pattern_signals(tenant_id, pattern_type, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_signals_confidence 
  ON os_pattern_signals(tenant_id, confidence DESC) 
  WHERE confidence >= 0.7;

CREATE INDEX IF NOT EXISTS idx_pattern_signals_recent 
  ON os_pattern_signals(tenant_id, created_at DESC) 
  WHERE created_at > NOW() - INTERVAL '30 days';

-- Learning scores indexes
CREATE INDEX IF NOT EXISTS idx_learning_scores_scope_period 
  ON os_learning_scores(tenant_id, scope_type, scope_key, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_learning_scores_trend 
  ON os_learning_scores(tenant_id, trend, overall_score) 
  WHERE trend = 'degrading';

CREATE INDEX IF NOT EXISTS idx_learning_scores_recent 
  ON os_learning_scores(tenant_id, computed_at DESC) 
  WHERE computed_at > NOW() - INTERVAL '7 days';

-- Lesson candidates indexes
CREATE INDEX IF NOT EXISTS idx_lesson_candidates_status_priority 
  ON os_lesson_candidates(tenant_id, status, confidence DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lesson_candidates_pending_review 
  ON os_lesson_candidates(tenant_id, created_at DESC) 
  WHERE status = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_lesson_candidates_approved 
  ON os_lesson_candidates(tenant_id, reviewed_at DESC) 
  WHERE status = 'approved';

-- Knowledge articles indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_store_published 
  ON os_knowledge_articles(tenant_id, knowledge_store, published, created_at DESC);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema AND table_name = 'os_knowledge_articles' AND column_name = 'tags') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_knowledge_articles_tags ON os_knowledge_articles USING GIN(tags) WHERE published = true';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_recent 
  ON os_knowledge_articles(tenant_id, published_at DESC) 
  WHERE published = true AND published_at > NOW() - INTERVAL '90 days';

-- Reflection notes indexes
CREATE INDEX IF NOT EXISTS idx_reflection_notes_type_scope 
  ON os_reflection_notes(tenant_id, reflection_type, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reflection_notes_confidence 
  ON os_reflection_notes(tenant_id, confidence DESC) 
  WHERE confidence >= 0.7;

-- Outcome memory indexes
CREATE INDEX IF NOT EXISTS idx_outcome_memory_case_observed 
  ON os_outcome_memory(case_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcome_memory_effectiveness 
  ON os_outcome_memory(tenant_id, effectiveness_score) 
  WHERE effectiveness_score IS NOT NULL;

-- Case timelines indexes
CREATE INDEX IF NOT EXISTS idx_case_timelines_case_event 
  ON os_case_timelines(case_id, event_type, occurred_at DESC);

-- Playbook versions indexes
CREATE INDEX IF NOT EXISTS idx_playbook_versions_status 
  ON os_playbook_versions(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_playbook_versions_approved 
  ON os_playbook_versions(tenant_id, approved_at DESC) 
  WHERE status = 'approved';

-- ═══════════════════════════════════════════════
-- MATERIALIZED VIEWS FOR AGGREGATED DATA
-- ═══════════════════════════════════════════════

-- Learning score summary (refreshed daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_learning_score_summary AS
SELECT 
  tenant_id,
  scope_type,
  scope_key,
  AVG(overall_score) as avg_score,
  MAX(overall_score) as max_score,
  MIN(overall_score) as min_score,
  COUNT(*) as score_count,
  MAX(computed_at) as last_computed,
  MAX(period_end) as latest_period
FROM os_learning_scores
GROUP BY tenant_id, scope_type, scope_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_learning_score_summary_unique 
  ON mv_learning_score_summary(tenant_id, scope_type, scope_key);

-- Pattern signal summary (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pattern_signal_summary AS
SELECT 
  tenant_id,
  pattern_type,
  COUNT(*) as total_patterns,
  AVG(confidence) as avg_confidence,
  SUM(occurrence_count) as total_occurrences,
  MAX(last_seen_at) as most_recent,
  COUNT(*) FILTER (WHERE confidence >= 0.7) as high_confidence_count
FROM os_pattern_signals
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY tenant_id, pattern_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pattern_signal_summary_unique 
  ON mv_pattern_signal_summary(tenant_id, pattern_type);

-- Case effectiveness summary (refreshed daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_case_effectiveness_summary AS
SELECT 
  tenant_id,
  case_type,
  COUNT(*) as total_cases,
  AVG(effectiveness_score) as avg_effectiveness,
  COUNT(*) FILTER (WHERE effectiveness_score >= 0.7) as high_effectiveness_count,
  COUNT(*) FILTER (WHERE effectiveness_score < 0.5) as low_effectiveness_count,
  COUNT(*) FILTER (WHERE observed_at IS NULL) as pending_evaluation_count
FROM os_case_memory
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY tenant_id, case_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_case_effectiveness_summary_unique 
  ON mv_case_effectiveness_summary(tenant_id, case_type);

-- Lesson candidate pipeline summary (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_lesson_pipeline_summary AS
SELECT 
  tenant_id,
  status,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  AVG(sample_size) as avg_sample_size,
  MAX(created_at) as most_recent
FROM os_lesson_candidates
GROUP BY tenant_id, status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_lesson_pipeline_summary_unique 
  ON mv_lesson_pipeline_summary(tenant_id, status);

-- ═══════════════════════════════════════════════
-- REFRESH FUNCTIONS
-- ═══════════════════════════════════════════════

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_learning_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_learning_score_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pattern_signal_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_case_effectiveness_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lesson_pipeline_summary;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════
-- STATISTICS UPDATES
-- ═══════════════════════════════════════════════

-- Update table statistics for better query planning
ANALYZE os_case_memory;
ANALYZE os_pattern_signals;
ANALYZE os_learning_scores;
ANALYZE os_lesson_candidates;
ANALYZE os_knowledge_articles;
ANALYZE os_reflection_notes;
