-- Migration 717: Evidence Module Performance Indexes
-- Optimizes queries for dashboard, reporting, freshness checks, and reuse analysis

-- Evidence requests: overdue detection queries
CREATE INDEX IF NOT EXISTS idx_evidence_requests_due_date
  ON evidence_requests (due_date DESC)
  WHERE status IN ('open', 'pending', 'overdue');

CREATE INDEX IF NOT EXISTS idx_evidence_requests_assignee_status
  ON evidence_requests (requested_from_user_id, status);

-- Evidence reviews: pending review queue
CREATE INDEX IF NOT EXISTS idx_evidence_reviews_pending
  ON evidence_reviews (reviewer_id)
  WHERE outcome IS NULL AND reviewed_at IS NULL;

-- Evidence: freshness status for batch checks
CREATE INDEX IF NOT EXISTS idx_evidence_freshness_status_active
  ON evidence (freshness_status)
  WHERE deleted_at IS NULL AND status NOT IN ('deleted', 'archived', 'disposed');

-- Evidence: owner-based queries (work queue, reports by owner)
CREATE INDEX IF NOT EXISTS idx_evidence_owner_status
  ON evidence (owner_user_id, status)
  WHERE deleted_at IS NULL;

-- Evidence: framework-based queries (audit readiness, framework reports)
CREATE INDEX IF NOT EXISTS idx_evidence_framework_status
  ON evidence (framework_code, status)
  WHERE deleted_at IS NULL AND framework_code IS NOT NULL;

-- Evidence: source system grouping (source coverage reports)
CREATE INDEX IF NOT EXISTS idx_evidence_source_system
  ON evidence (source_system_name)
  WHERE deleted_at IS NULL;

-- Evidence links: entity lookup (linked objects, orphan detection)
CREATE INDEX IF NOT EXISTS idx_evidence_links_evidence
  ON evidence_links (evidence_id);

CREATE INDEX IF NOT EXISTS idx_evidence_links_object
  ON evidence_links (linked_object_type, linked_object_id);

-- Evidence packages: type + status filtering
CREATE INDEX IF NOT EXISTS idx_evidence_packages_type_status
  ON evidence_packages (package_type, status);

-- Evidence collection runs: connector health queries
CREATE INDEX IF NOT EXISTS idx_evidence_coll_runs_connector_time
  ON evidence_collection_runs (connector_id, started_at DESC);

-- Evidence freshness records: expiry detection
CREATE INDEX IF NOT EXISTS idx_evidence_freshness_expires
  ON evidence_freshness_records (expires_at)
  WHERE expires_at IS NOT NULL;

-- Evidence quality assessments: evidence lookup
CREATE INDEX IF NOT EXISTS idx_evidence_qa_evidence
  ON evidence_quality_assessments (evidence_id, assessed_at DESC);

-- Evidence duplicate candidates: unresolved detection
CREATE INDEX IF NOT EXISTS idx_evidence_duplicates_unresolved
  ON evidence_duplicate_candidates (resolved)
  WHERE resolved = false;

-- Evidence tags: key lookup for filtering
CREATE INDEX IF NOT EXISTS idx_evidence_tags_evidence_key
  ON evidence_tags (evidence_id, tag_key);

-- Notification queue: evidence-specific notification lookup
CREATE INDEX IF NOT EXISTS idx_notification_queue_type_status
  ON notification_queue (notification_type, status)
  WHERE notification_type LIKE 'evidence_%';

-- Evidence: valid_to for expiry queries
CREATE INDEX IF NOT EXISTS idx_evidence_valid_to_active
  ON evidence (valid_to)
  WHERE valid_to IS NOT NULL AND deleted_at IS NULL AND status NOT IN ('deleted', 'archived', 'disposed');

-- Evidence: reusable flag for reuse candidates
CREATE INDEX IF NOT EXISTS idx_evidence_reusable_active
  ON evidence (reusable_flag)
  WHERE reusable_flag = true AND deleted_at IS NULL;
