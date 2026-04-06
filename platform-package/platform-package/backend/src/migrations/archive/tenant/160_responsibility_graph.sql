-- Migration 160: Responsibility Graph — 3-layer onboarding model
-- Creates module_assignments, person_profiles, responsibility_suggestions
-- Adds relational ownership columns alongside legacy free-text fields

-- ─── Table 1: person_profiles ───────────────────────────────────────────────
-- Enriches public.users with tenant-scoped person identity (Layer 1)
CREATE TABLE IF NOT EXISTS person_profiles (
  profile_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 VARCHAR(64) NOT NULL UNIQUE,
  full_name               VARCHAR(255) NOT NULL,
  work_email              VARCHAR(320) NOT NULL,
  phone                   VARCHAR(30),
  department_id           UUID,
  job_title               VARCHAR(255),
  direct_manager_user_id  VARCHAR(64),
  language_code           VARCHAR(5) DEFAULT 'ar',
  business_function       VARCHAR(50)
    CHECK (business_function IN (
      'compliance','it','security','audit','legal',
      'procurement','hr','executive','operations','finance'
    )),
  notification_channels   JSONB DEFAULT '["email"]'::jsonb,
  source                  VARCHAR(30) NOT NULL DEFAULT 'onboarding'
    CHECK (source IN ('onboarding','manual','csv_import','ad_sync')),
  status                  VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','pending','suspended','deactivated')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_profiles_email
  ON person_profiles(work_email);
CREATE INDEX IF NOT EXISTS idx_person_profiles_dept
  ON person_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_person_profiles_function
  ON person_profiles(business_function);
CREATE INDEX IF NOT EXISTS idx_person_profiles_status
  ON person_profiles(status) WHERE status = 'active';


-- ─── Table 2: module_assignments ────────────────────────────────────────────
-- Core responsibility graph table (Layer 2)
-- Maps: user × module × scope → responsibility_type
CREATE TABLE IF NOT EXISTS module_assignments (
  assignment_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             VARCHAR(64) NOT NULL,
  organization_id     UUID,
  module_code         VARCHAR(50) NOT NULL
    CHECK (module_code IN (
      'risk','evidence','audit','vendor','policy','compliance',
      'incidents','privacy','bcm','training','data_governance'
    )),
  scope_type          VARCHAR(30) NOT NULL DEFAULT 'organization'
    CHECK (scope_type IN (
      'organization','department','business_unit',
      'asset_group','framework','control_family'
    )),
  scope_id            VARCHAR(64),
  responsibility_type VARCHAR(30) NOT NULL
    CHECK (responsibility_type IN (
      'approver','owner','contributor','reviewer','observer'
    )),
  is_primary          BOOLEAN NOT NULL DEFAULT true,
  backup_user_id      VARCHAR(64),
  approval_level      INT DEFAULT 0,
  sla_hours           INT,
  escalation_rule_id  UUID,
  delegate_user_id    VARCHAR(64),
  effective_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to        TIMESTAMPTZ,
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','pending','suspended','expired')),
  source              VARCHAR(30) NOT NULL DEFAULT 'onboarding'
    CHECK (source IN ('onboarding','manual','csv_import','ad_sync','auto_suggest')),
  created_by          VARCHAR(64) NOT NULL DEFAULT 'system',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite uniqueness: one responsibility per user × module × scope × type
CREATE UNIQUE INDEX IF NOT EXISTS uq_module_assignments_combo
  ON module_assignments(user_id, module_code, scope_type, COALESCE(scope_id, ''), responsibility_type);

CREATE INDEX IF NOT EXISTS idx_module_assignments_user
  ON module_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_module_assignments_module
  ON module_assignments(module_code, scope_type);
CREATE INDEX IF NOT EXISTS idx_module_assignments_scope
  ON module_assignments(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_module_assignments_active
  ON module_assignments(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_module_assignments_primary
  ON module_assignments(module_code, is_primary) WHERE is_primary = true AND status = 'active';


-- ─── Table 3: responsibility_suggestions ────────────────────────────────────
-- Auto-suggest staging table (Layer 3 confirm/reject UI)
CREATE TABLE IF NOT EXISTS responsibility_suggestions (
  suggestion_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          VARCHAR(64),
  user_id             VARCHAR(64) NOT NULL,
  module_code         VARCHAR(50) NOT NULL,
  scope_type          VARCHAR(30) NOT NULL DEFAULT 'organization',
  scope_id            VARCHAR(64),
  responsibility_type VARCHAR(30) NOT NULL,
  confidence          NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  reason_en           TEXT,
  reason_ar           TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','modified')),
  resolved_by         VARCHAR(64),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resp_suggestions_user
  ON responsibility_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_resp_suggestions_session
  ON responsibility_suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_resp_suggestions_pending
  ON responsibility_suggestions(status) WHERE status = 'pending';


-- ─── ALTER existing tables: add relational ownership columns ────────────────
-- These sit alongside legacy free-text columns for backwards compatibility

-- evidence_tasks: relational assignment
ALTER TABLE evidence_tasks
  ADD COLUMN IF NOT EXISTS assigned_user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS assigned_team_id UUID;

-- plan_item_instances: relational owner
ALTER TABLE plan_item_instances
  ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64);

-- obligations: relational ownership
ALTER TABLE obligations
  ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS owner_team_id UUID;
