BEGIN;

CREATE TABLE IF NOT EXISTS feature_flags (
  feature_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agrc_engine_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name text NOT NULL DEFAULT 'agrc-os-v1',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  status text NOT NULL DEFAULT 'running',
  trigger_mode text NOT NULL DEFAULT 'scheduled',
  triggered_by text NULL,
  controls_evaluated integer NOT NULL DEFAULT 0,
  stale_controls integer NOT NULL DEFAULT 0,
  overdue_remediations integer NOT NULL DEFAULT 0,
  kri_breaches integer NOT NULL DEFAULT 0,
  policy_reviews_started integer NOT NULL DEFAULT 0,
  tasks_created integer NOT NULL DEFAULT 0,
  notifications_created integer NOT NULL DEFAULT 0,
  escalations_triggered integer NOT NULL DEFAULT 0,
  error_message text NULL
);

CREATE TABLE IF NOT EXISTS agrc_engine_dedup (
  dedup_key text PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agrc_engine_dedup_expires
  ON agrc_engine_dedup(expires_at);

CREATE INDEX IF NOT EXISTS idx_agrc_engine_runs_started
  ON agrc_engine_runs(started_at DESC);

INSERT INTO feature_flags (feature_key, enabled)
VALUES
  ('agrc_engine_enabled', true),
  ('agrc_control_monitor_enabled', true),
  ('agrc_remediation_monitor_enabled', true),
  ('agrc_kri_monitor_enabled', true),
  ('agrc_policy_review_enabled', true),
  ('agrc_auto_task_creation_enabled', true),
  ('agrc_auto_notification_enabled', true)
ON CONFLICT (feature_key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  updated_at = now();

COMMIT;
