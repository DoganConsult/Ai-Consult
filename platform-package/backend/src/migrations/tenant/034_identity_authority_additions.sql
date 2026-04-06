-- ============================================================================
-- Migration 034: Identity & Authority — 6 NEW tables
-- Domain B: delegated_authorities, authority_levels, responsibilities,
--           responsibility_assignments, raci_templates, raci_assignments
-- ============================================================================

-- ============================================================
-- 1. delegated_authorities
-- ============================================================
CREATE TABLE IF NOT EXISTS delegated_authorities (
  delegation_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_user_id  VARCHAR(64) NOT NULL,
  delegate_user_id   VARCHAR(64) NOT NULL,
  authority_type     VARCHAR(100) NOT NULL,
  scope_type         VARCHAR(50),
  scope_id           UUID,
  valid_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to           TIMESTAMPTZ,
  conditions         JSONB DEFAULT '{}',
  status             VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','revoked','expired','pending')),
  approved_by        VARCHAR(64),
  approved_at        TIMESTAMPTZ,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_deleg_auth_delegator   ON delegated_authorities(delegator_user_id);
CREATE INDEX IF NOT EXISTS idx_deleg_auth_delegate    ON delegated_authorities(delegate_user_id);
CREATE INDEX IF NOT EXISTS idx_deleg_auth_type        ON delegated_authorities(authority_type);
CREATE INDEX IF NOT EXISTS idx_deleg_auth_scope       ON delegated_authorities(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_deleg_auth_status      ON delegated_authorities(status);
CREATE INDEX IF NOT EXISTS idx_deleg_auth_validity    ON delegated_authorities(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_deleg_auth_deleted     ON delegated_authorities(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. authority_levels
-- ============================================================
CREATE TABLE IF NOT EXISTS authority_levels (
  level_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_code             VARCHAR(50) NOT NULL UNIQUE,
  name_en                VARCHAR(255) NOT NULL,
  name_ar                VARCHAR(255),
  rank                   INT NOT NULL DEFAULT 0,
  approval_limit_amount  NUMERIC(18,2),
  can_approve_risk_level INT DEFAULT 0,
  description_en         TEXT,
  description_ar         TEXT,
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ,
  created_by             VARCHAR(64),
  updated_by             VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_authority_levels_code   ON authority_levels(level_code);
CREATE INDEX IF NOT EXISTS idx_authority_levels_rank   ON authority_levels(rank);
CREATE INDEX IF NOT EXISTS idx_authority_levels_del    ON authority_levels(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. responsibilities
-- ============================================================
CREATE TABLE IF NOT EXISTS responsibilities (
  responsibility_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               VARCHAR(100) NOT NULL UNIQUE,
  name_en            VARCHAR(255) NOT NULL,
  name_ar            VARCHAR(255),
  description_en     TEXT,
  description_ar     TEXT,
  category           VARCHAR(100),
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_responsibilities_code   ON responsibilities(code);
CREATE INDEX IF NOT EXISTS idx_responsibilities_cat    ON responsibilities(category);
CREATE INDEX IF NOT EXISTS idx_responsibilities_del    ON responsibilities(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. responsibility_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS responsibility_assignments (
  assignment_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsibility_id  UUID NOT NULL REFERENCES responsibilities(responsibility_id) ON DELETE CASCADE,
  assignee_type      VARCHAR(30) NOT NULL
    CHECK (assignee_type IN ('user','role','position','team')),
  assignee_id        UUID NOT NULL,
  scope_type         VARCHAR(50),
  scope_id           UUID,
  is_primary         BOOLEAN NOT NULL DEFAULT FALSE,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_resp_assign_resp        ON responsibility_assignments(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_resp_assign_type        ON responsibility_assignments(assignee_type);
CREATE INDEX IF NOT EXISTS idx_resp_assign_assignee    ON responsibility_assignments(assignee_id);
CREATE INDEX IF NOT EXISTS idx_resp_assign_scope       ON responsibility_assignments(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_resp_assign_primary     ON responsibility_assignments(is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_resp_assign_deleted     ON responsibility_assignments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 5. raci_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS raci_templates (
  template_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en            VARCHAR(255) NOT NULL,
  name_ar            VARCHAR(255),
  process_type       VARCHAR(100),
  version            INT NOT NULL DEFAULT 1,
  status             VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','archived')),
  is_default         BOOLEAN NOT NULL DEFAULT FALSE,
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_raci_templates_process  ON raci_templates(process_type);
CREATE INDEX IF NOT EXISTS idx_raci_templates_status   ON raci_templates(status);
CREATE INDEX IF NOT EXISTS idx_raci_templates_default  ON raci_templates(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_raci_templates_deleted  ON raci_templates(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 6. raci_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS raci_assignments (
  assignment_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id        UUID NOT NULL REFERENCES raci_templates(template_id) ON DELETE CASCADE,
  activity_code      VARCHAR(100) NOT NULL,
  activity_name_en   VARCHAR(255) NOT NULL,
  activity_name_ar   VARCHAR(255),
  responsible_id     UUID,
  accountable_id     UUID,
  consulted_ids      UUID[] DEFAULT '{}',
  informed_ids       UUID[] DEFAULT '{}',
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_raci_assign_template    ON raci_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_raci_assign_activity    ON raci_assignments(activity_code);
CREATE INDEX IF NOT EXISTS idx_raci_assign_responsible ON raci_assignments(responsible_id);
CREATE INDEX IF NOT EXISTS idx_raci_assign_accountable ON raci_assignments(accountable_id);
CREATE INDEX IF NOT EXISTS idx_raci_assign_deleted     ON raci_assignments(deleted_at) WHERE deleted_at IS NULL;
