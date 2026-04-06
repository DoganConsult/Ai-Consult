BEGIN;

CREATE TABLE IF NOT EXISTS pack_selection_policies (
  policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  target_pack_code text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  stop_on_match boolean NOT NULL DEFAULT false,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcome jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NULL,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pack_selection_decisions (
  decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  tenant_id text NOT NULL,
  policy_code text NOT NULL,
  target_pack_code text NOT NULL,
  decision_status text NOT NULL,
  matched boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 100,
  rationale text NULL,
  evaluation_snapshot jsonb NULL,
  selected_by text NOT NULL DEFAULT 'policy_engine',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pack_selection_policies_priority
  ON pack_selection_policies(priority);

CREATE INDEX IF NOT EXISTS idx_pack_selection_decisions_session
  ON pack_selection_decisions(session_id);

CREATE INDEX IF NOT EXISTS idx_pack_selection_decisions_tenant
  ON pack_selection_decisions(tenant_id);

COMMIT;
