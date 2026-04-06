-- ============================================================
-- 202: Foundation Enterprise Completion
-- Adds: manager hierarchy, access review campaigns,
--        role assignment history, reference data governance
-- ============================================================

-- 1. Manager Hierarchy on public users table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'manager_user_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN manager_user_id VARCHAR(64);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_manager ON public.users(manager_user_id) WHERE manager_user_id IS NOT NULL;

-- 2. Access Review Campaigns
CREATE TABLE IF NOT EXISTS access_review_campaigns (
  campaign_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  scope_type     VARCHAR(50) NOT NULL DEFAULT 'tenant'
    CHECK (scope_type IN ('tenant','department','business_unit','team','role')),
  scope_id       VARCHAR(255),
  status         VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','completed','cancelled')),
  reviewer_id    VARCHAR(64),
  due_date       TIMESTAMPTZ,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_by     VARCHAR(64),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arc_status ON access_review_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_arc_due ON access_review_campaigns(due_date) WHERE status = 'active';

-- 3. Access Review Items
CREATE TABLE IF NOT EXISTS access_review_items (
  item_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES access_review_campaigns(campaign_id) ON DELETE CASCADE,
  user_id        VARCHAR(64) NOT NULL,
  user_email     VARCHAR(255),
  user_name      VARCHAR(255),
  role_code      VARCHAR(100),
  role_name      VARCHAR(255),
  department_id  UUID,
  current_status VARCHAR(30),
  decision       VARCHAR(30) CHECK (decision IN ('confirm','revoke','modify',NULL)),
  decision_by    VARCHAR(64),
  decision_at    TIMESTAMPTZ,
  decision_notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ari_campaign ON access_review_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ari_user ON access_review_items(user_id);
CREATE INDEX IF NOT EXISTS idx_ari_decision ON access_review_items(decision) WHERE decision IS NULL;

-- 4. Role Assignment History
CREATE TABLE IF NOT EXISTS role_assignment_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        VARCHAR(64) NOT NULL,
  role_code      VARCHAR(100) NOT NULL,
  role_name      VARCHAR(255),
  action         VARCHAR(30) NOT NULL CHECK (action IN ('assigned','revoked','expired','modified')),
  assigned_by    VARCHAR(64),
  revoked_by     VARCHAR(64),
  reason         TEXT,
  valid_from     TIMESTAMPTZ,
  valid_to       TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rah_user ON role_assignment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rah_role ON role_assignment_history(role_code);
CREATE INDEX IF NOT EXISTS idx_rah_action ON role_assignment_history(action);

-- 5. Reference Data Categories (generic governable catalog)
CREATE TABLE IF NOT EXISTS reference_categories (
  category_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_type  VARCHAR(50) NOT NULL,
  code           VARCHAR(100),
  name_en        VARCHAR(255) NOT NULL,
  name_ar        VARCHAR(255),
  description    TEXT,
  status         VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','deprecated','archived')),
  display_order  INTEGER DEFAULT 0,
  usage_count    INTEGER DEFAULT 0,
  metadata       JSONB DEFAULT '{}',
  created_by     VARCHAR(64),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refcat_type ON reference_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_refcat_status ON reference_categories(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refcat_type_code ON reference_categories(category_type, code) WHERE code IS NOT NULL;
