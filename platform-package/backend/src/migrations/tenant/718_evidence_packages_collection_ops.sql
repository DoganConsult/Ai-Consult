-- Migration 718: Evidence Packages, Collection Operations, Activity & Cache
-- Creates tables for audit-ready packaging, collection rule/job/run tracking,
-- activity logging, and dashboard caching.

-- 1. evidence_packages — groupable evidence bundles for audit/regulator/framework export
CREATE TABLE IF NOT EXISTS evidence_packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  package_type      VARCHAR(30) NOT NULL DEFAULT 'audit',
  framework_code    VARCHAR(30),
  scope_start       DATE,
  scope_end         DATE,
  status            VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by        VARCHAR(64) NOT NULL,
  finalized_at      TIMESTAMPTZ,
  finalized_by      VARCHAR(64),
  exported_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_status ON evidence_packages(status);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_type ON evidence_packages(package_type);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_fw ON evidence_packages(framework_code);

-- 2. evidence_package_items — items within a package
CREATE TABLE IF NOT EXISTS evidence_package_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id        UUID NOT NULL REFERENCES evidence_packages(id) ON DELETE CASCADE,
  evidence_id       UUID NOT NULL,
  sort_order        INT DEFAULT 0,
  notes             TEXT,
  added_by          VARCHAR(64),
  added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_pkg_items_pkg ON evidence_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_evidence_pkg_items_eid ON evidence_package_items(evidence_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_pkg_items_unique ON evidence_package_items(package_id, evidence_id);

-- 3. evidence_exports — export history per package
CREATE TABLE IF NOT EXISTS evidence_exports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id        UUID NOT NULL REFERENCES evidence_packages(id) ON DELETE CASCADE,
  format            VARCHAR(20) NOT NULL DEFAULT 'zip',
  file_path         VARCHAR(500),
  file_size_bytes   BIGINT DEFAULT 0,
  exported_by       VARCHAR(64) NOT NULL,
  exported_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_exports_pkg ON evidence_exports(package_id);

-- 4. evidence_export_manifests — structured manifest per export
CREATE TABLE IF NOT EXISTS evidence_export_manifests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id         UUID NOT NULL REFERENCES evidence_exports(id) ON DELETE CASCADE,
  manifest_data     JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. evidence_collection_rules — configurable automated collection rules
CREATE TABLE IF NOT EXISTS evidence_collection_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  connector_type        VARCHAR(50) NOT NULL,
  evidence_type_code    VARCHAR(50),
  control_id_pattern    VARCHAR(200),
  source_config         JSONB DEFAULT '{}',
  cron_expression       VARCHAR(50) NOT NULL DEFAULT '0 4 * * *',
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            VARCHAR(64),
  last_run_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_coll_rules_active ON evidence_collection_rules(active);
CREATE INDEX IF NOT EXISTS idx_evidence_coll_rules_type ON evidence_collection_rules(connector_type);

-- 6. evidence_collection_jobs — individual job executions
CREATE TABLE IF NOT EXISTS evidence_collection_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id           UUID REFERENCES evidence_collection_rules(id) ON DELETE SET NULL,
  connector_id      UUID,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  items_collected   INT NOT NULL DEFAULT 0,
  items_failed      INT NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_coll_jobs_rule ON evidence_collection_jobs(rule_id);
CREATE INDEX IF NOT EXISTS idx_evidence_coll_jobs_status ON evidence_collection_jobs(status);

-- 7. evidence_collection_runs — per-item results within a job
CREATE TABLE IF NOT EXISTS evidence_collection_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID NOT NULL REFERENCES evidence_collection_jobs(id) ON DELETE CASCADE,
  evidence_id       UUID,
  source_reference  VARCHAR(500),
  collected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata          JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_evidence_coll_runs_job ON evidence_collection_runs(job_id);

-- 8. evidence_activity_log — dedicated module activity trail
CREATE TABLE IF NOT EXISTS evidence_activity_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id       UUID,
  action            VARCHAR(50) NOT NULL,
  actor             VARCHAR(64) NOT NULL,
  actor_role        VARCHAR(30),
  entity_type       VARCHAR(30),
  entity_id         VARCHAR(100),
  details           JSONB DEFAULT '{}',
  ip_address        VARCHAR(45),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_activity_eid ON evidence_activity_log(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_activity_actor ON evidence_activity_log(actor);
CREATE INDEX IF NOT EXISTS idx_evidence_activity_time ON evidence_activity_log(created_at DESC);

-- 9. evidence_dashboard_cache — pre-computed dashboard widget data
CREATE TABLE IF NOT EXISTS evidence_dashboard_cache (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key         VARCHAR(100) NOT NULL UNIQUE,
  data              JSONB NOT NULL DEFAULT '{}',
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_seconds       INT NOT NULL DEFAULT 300
);
