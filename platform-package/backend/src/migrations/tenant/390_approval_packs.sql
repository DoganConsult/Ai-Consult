CREATE TABLE IF NOT EXISTS approval_packs (
  pack_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  initiative_code TEXT NOT NULL,
  module_code    TEXT NOT NULL,
  pack_data      JSONB NOT NULL DEFAULT '{}',
  priority       TEXT NOT NULL DEFAULT 'medium',
  status         TEXT NOT NULL DEFAULT 'pending_review',
  reviewer_user_id TEXT,
  reviewed_at    TIMESTAMPTZ,
  review_notes   TEXT,
  created_by     TEXT NOT NULL DEFAULT 'governance-os',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_packs_tenant ON approval_packs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_packs_status ON approval_packs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_packs_module ON approval_packs (tenant_id, module_code);
CREATE INDEX IF NOT EXISTS idx_approval_packs_initiative ON approval_packs (tenant_id, initiative_code);
