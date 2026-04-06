BEGIN;

CREATE TABLE IF NOT EXISTS operating_packs (
  pack_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  pack_type text NOT NULL,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  manifest jsonb NOT NULL,
  metadata jsonb NULL,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pack_installations (
  installation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_code text NOT NULL,
  pack_version text NOT NULL,
  installation_scope text NOT NULL DEFAULT 'tenant',
  workspace_id uuid NULL,
  applies_to_role text NULL,
  installed_by text NULL,
  install_status text NOT NULL DEFAULT 'installed',
  install_log jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operating_packs_type
  ON operating_packs(pack_type);

CREATE INDEX IF NOT EXISTS idx_pack_installations_code
  ON pack_installations(pack_code);

COMMIT;
