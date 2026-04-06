-- Migration 715: Policy Module — Enterprise Grade
-- Covers all spec gaps: categories, exceptions, publications, linkage,
-- versioning enhancements, bilingual, scores, dashboard cache, delivery records

-- ============================================================
-- A1: policy_categories — hierarchical taxonomy
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_categories (
  category_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50)  NOT NULL UNIQUE,
  name_en         VARCHAR(200) NOT NULL,
  name_ar         VARCHAR(200),
  parent_id       UUID REFERENCES policy_categories(category_id),
  business_domain VARCHAR(100),
  description_en  TEXT,
  description_ar  TEXT,
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polcat_parent ON policy_categories(parent_id);

-- Seed default categories
INSERT INTO policy_categories (code, name_en, name_ar, business_domain, sort_order) VALUES
  ('governance',           'Governance',                    'الحوكمة',             'governance',  1),
  ('compliance',           'Compliance',                    'الامتثال',            'compliance',  2),
  ('information_security', 'Information Security',          'أمن المعلومات',       'it',          3),
  ('privacy',              'Privacy & Data Protection',     'الخصوصية وحماية البيانات', 'legal',  4),
  ('hr',                   'Human Resources',               'الموارد البشرية',     'hr',          5),
  ('vendor',               'Vendor & Third-Party',          'الموردون والأطراف الثالثة', 'procurement', 6),
  ('operations',           'Operations',                    'العمليات',            'operations',  7),
  ('quality',              'Quality Management',            'إدارة الجودة',        'quality',     8),
  ('finance',              'Finance & Accounting',          'المالية والمحاسبة',   'finance',     9),
  ('business_continuity',  'Business Continuity',           'استمرارية الأعمال',   'operations', 10),
  ('ai_governance',        'AI Governance',                 'حوكمة الذكاء الاصطناعي', 'technology', 11),
  ('engineering',          'Product & Engineering',         'المنتجات والهندسة',   'technology', 12)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- A2: Alter policies table — bilingual, domain, audience, supersession
-- ============================================================
ALTER TABLE policies ADD COLUMN IF NOT EXISTS title_en         VARCHAR(255);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS title_ar         VARCHAR(255);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS description_en   TEXT;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS description_ar   TEXT;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS business_domain  VARCHAR(100);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS audience_scope   VARCHAR(50) DEFAULT 'all';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS publication_state VARCHAR(50) DEFAULT 'unpublished';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS superseded_by_id VARCHAR(16);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS supersedes_id    VARCHAR(16);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS category_id      UUID;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS linked_risks     TEXT[] DEFAULT '{}';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS author_user_id   VARCHAR(64);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS approver_user_id VARCHAR(64);

-- Backfill title_en from title where null
UPDATE policies SET title_en = title WHERE title_en IS NULL;

-- ============================================================
-- A3: Alter policy_versions — major/minor, per-version approval
-- ============================================================
ALTER TABLE policy_versions ADD COLUMN IF NOT EXISTS major_version          INT DEFAULT 1;
ALTER TABLE policy_versions ADD COLUMN IF NOT EXISTS minor_version          INT DEFAULT 0;
ALTER TABLE policy_versions ADD COLUMN IF NOT EXISTS effective_date         DATE;
ALTER TABLE policy_versions ADD COLUMN IF NOT EXISTS approved_at            TIMESTAMPTZ;
ALTER TABLE policy_versions ADD COLUMN IF NOT EXISTS approved_by            VARCHAR(64);
ALTER TABLE policy_versions ADD COLUMN IF NOT EXISTS supersedes_version_id  UUID;
ALTER TABLE policy_versions ADD COLUMN IF NOT EXISTS review_notes           TEXT;

-- ============================================================
-- A4: policy_exception_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_exception_requests (
  exception_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id             VARCHAR(16) NOT NULL,
  policy_clause_scope   TEXT,
  reason                TEXT NOT NULL,
  business_justification TEXT,
  compensating_controls TEXT,
  risk_assessment       TEXT,
  requested_by          VARCHAR(64) NOT NULL,
  status                VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','under_review','approved','rejected','renewed','closed','expired')),
  priority              VARCHAR(20) DEFAULT 'medium',
  expiry_date           DATE,
  renewal_date          DATE,
  approved_by           VARCHAR(64),
  approved_at           TIMESTAMPTZ,
  rejected_by           VARCHAR(64),
  rejected_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  closed_by             VARCHAR(64),
  closed_at             TIMESTAMPTZ,
  close_comment         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pexreq_policy ON policy_exception_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_pexreq_status ON policy_exception_requests(status);
CREATE INDEX IF NOT EXISTS idx_pexreq_expiry ON policy_exception_requests(expiry_date) WHERE status = 'approved';

-- ============================================================
-- A5: policy_exception_approvals — audit trail per decision
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_exception_approvals (
  approval_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id        UUID NOT NULL REFERENCES policy_exception_requests(exception_id),
  approver_user_id    VARCHAR(64) NOT NULL,
  decision            VARCHAR(20) NOT NULL CHECK (decision IN ('approve','reject','request_info','renew','close')),
  comment             TEXT,
  conditions          TEXT,
  reason              TEXT,
  decided_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pexappr_exc ON policy_exception_approvals(exception_id);

-- ============================================================
-- A6: policy_publications — campaign-based publication
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_publications (
  publication_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           VARCHAR(16) NOT NULL,
  policy_version_id   UUID,
  campaign_name       VARCHAR(255) NOT NULL,
  published_by        VARCHAR(64) NOT NULL,
  publish_channel     VARCHAR(50) NOT NULL DEFAULT 'portal'
                      CHECK (publish_channel IN ('portal','email','teams','lms','all')),
  status              VARCHAR(30) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','scheduled','active','sent','completed','recalled')),
  scheduled_at        TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  recalled_at         TIMESTAMPTZ,
  recalled_by         VARCHAR(64),
  recall_reason       TEXT,
  message             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polpub_policy ON policy_publications(policy_id);
CREATE INDEX IF NOT EXISTS idx_polpub_status ON policy_publications(status);

-- ============================================================
-- A7: policy_publication_audiences — targeting
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_publication_audiences (
  audience_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id      UUID NOT NULL REFERENCES policy_publications(publication_id),
  audience_type       VARCHAR(50) NOT NULL
                      CHECK (audience_type IN ('all','role','business_unit','legal_entity','geography','department','team','contractor','vendor','individual')),
  audience_ref        VARCHAR(255),
  audience_name       VARCHAR(255),
  user_count          INT DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_polpubaud_pub ON policy_publication_audiences(publication_id);

-- ============================================================
-- A8: policy_delivery_records — per-user delivery tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_delivery_records (
  delivery_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id      UUID NOT NULL REFERENCES policy_publications(publication_id),
  user_id             VARCHAR(64) NOT NULL,
  channel             VARCHAR(50),
  delivered_at        TIMESTAMPTZ,
  viewed_at           TIMESTAMPTZ,
  acknowledged_at     TIMESTAMPTZ,
  status              VARCHAR(30) DEFAULT 'pending'
                      CHECK (status IN ('pending','delivered','viewed','acknowledged','declined','expired')),
  declined_reason     TEXT,
  declined_at         TIMESTAMPTZ,
  reminder_count      INT DEFAULT 0,
  last_reminded_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_poldelrec_pub  ON policy_delivery_records(publication_id);
CREATE INDEX IF NOT EXISTS idx_poldelrec_user ON policy_delivery_records(user_id);
CREATE INDEX IF NOT EXISTS idx_poldelrec_pend ON policy_delivery_records(status) WHERE status IN ('pending','delivered');

-- ============================================================
-- A9: policy_control_links — junction table (replaces TEXT[] array)
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_control_links (
  link_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           VARCHAR(16) NOT NULL,
  control_id          VARCHAR(100) NOT NULL,
  link_type           VARCHAR(30) NOT NULL DEFAULT 'implements',
  relevance_score     NUMERIC(5,2) DEFAULT 100.00,
  notes               TEXT,
  created_by          VARCHAR(128),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, control_id)
);
CREATE INDEX IF NOT EXISTS idx_pcl_policy  ON policy_control_links(policy_id);
CREATE INDEX IF NOT EXISTS idx_pcl_control ON policy_control_links(control_id);

-- Migrate existing linked_controls array data into junction table
INSERT INTO policy_control_links (policy_id, control_id, link_type, created_by)
SELECT p.policy_id, unnest(p.linked_controls), 'implements', 'migration_715'
FROM policies p
WHERE array_length(p.linked_controls, 1) > 0
ON CONFLICT (policy_id, control_id) DO NOTHING;

-- ============================================================
-- A10: policy_risk_links — junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_risk_links (
  link_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           VARCHAR(16) NOT NULL,
  risk_id             VARCHAR(100) NOT NULL,
  link_type           VARCHAR(30) NOT NULL DEFAULT 'mitigates',
  relevance_score     NUMERIC(5,2) DEFAULT 100.00,
  notes               TEXT,
  created_by          VARCHAR(128),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, risk_id)
);
CREATE INDEX IF NOT EXISTS idx_prl_policy ON policy_risk_links(policy_id);
CREATE INDEX IF NOT EXISTS idx_prl_risk   ON policy_risk_links(risk_id);

-- ============================================================
-- A11: policy_issue_links — junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_issue_links (
  link_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           VARCHAR(16) NOT NULL,
  issue_id            VARCHAR(100) NOT NULL,
  link_type           VARCHAR(30) NOT NULL DEFAULT 'related',
  notes               TEXT,
  created_by          VARCHAR(128),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, issue_id)
);
CREATE INDEX IF NOT EXISTS idx_pil_policy ON policy_issue_links(policy_id);
CREATE INDEX IF NOT EXISTS idx_pil_issue  ON policy_issue_links(issue_id);

-- ============================================================
-- A12: policy_scores — computed coverage / freshness / ack scores
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_scores (
  score_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           VARCHAR(16) NOT NULL,
  score_type          VARCHAR(50) NOT NULL
                      CHECK (score_type IN ('coverage','freshness','acknowledgment','exception','overall','compliance')),
  score_value         NUMERIC(5,2) NOT NULL DEFAULT 0,
  details             JSONB DEFAULT '{}',
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, score_type)
);
CREATE INDEX IF NOT EXISTS idx_polscores_policy ON policy_scores(policy_id);

-- ============================================================
-- A13: policy_version_diffs — server-side diff storage
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_version_diffs (
  diff_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id           VARCHAR(16) NOT NULL,
  from_version_id     UUID NOT NULL,
  to_version_id       UUID NOT NULL,
  diff_data           JSONB NOT NULL DEFAULT '{}',
  additions           INT DEFAULT 0,
  deletions           INT DEFAULT 0,
  modifications       INT DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_version_id, to_version_id)
);
CREATE INDEX IF NOT EXISTS idx_pvdiffs_policy ON policy_version_diffs(policy_id);

-- ============================================================
-- A14: policy_dashboard_cache — server-side KPI cache
-- ============================================================
CREATE TABLE IF NOT EXISTS policy_dashboard_cache (
  cache_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key           VARCHAR(100) NOT NULL UNIQUE,
  data                JSONB NOT NULL DEFAULT '{}',
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

-- ============================================================
-- A15: Enhance attestation_campaigns — audience scope + channel
-- ============================================================
ALTER TABLE attestation_campaigns ADD COLUMN IF NOT EXISTS audience_scope     VARCHAR(50) DEFAULT 'manual';
ALTER TABLE attestation_campaigns ADD COLUMN IF NOT EXISTS publish_channel    VARCHAR(50) DEFAULT 'portal';
ALTER TABLE attestation_campaigns ADD COLUMN IF NOT EXISTS publication_id     UUID;
ALTER TABLE attestation_campaigns ADD COLUMN IF NOT EXISTS escalation_role    VARCHAR(100);
ALTER TABLE attestation_campaigns ADD COLUMN IF NOT EXISTS escalation_after_days INT DEFAULT 14;
ALTER TABLE attestation_campaigns ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- A16: Enhance attestation_records — delivery tracking
-- ============================================================
ALTER TABLE attestation_records ADD COLUMN IF NOT EXISTS viewed_at           TIMESTAMPTZ;
ALTER TABLE attestation_records ADD COLUMN IF NOT EXISTS delivered_at        TIMESTAMPTZ;
ALTER TABLE attestation_records ADD COLUMN IF NOT EXISTS reminder_count      INT DEFAULT 0;
ALTER TABLE attestation_records ADD COLUMN IF NOT EXISTS escalated           BOOLEAN DEFAULT FALSE;
ALTER TABLE attestation_records ADD COLUMN IF NOT EXISTS escalated_at       TIMESTAMPTZ;

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_policies_status       ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_category     ON policies(category);
CREATE INDEX IF NOT EXISTS idx_policies_category_id  ON policies(category_id);
CREATE INDEX IF NOT EXISTS idx_policies_owner        ON policies(owner);
CREATE INDEX IF NOT EXISTS idx_policies_review_date  ON policies(next_review_date);
CREATE INDEX IF NOT EXISTS idx_policies_pub_state    ON policies(publication_state);
CREATE INDEX IF NOT EXISTS idx_policies_deleted      ON policies(deleted_at) WHERE deleted_at IS NULL;
