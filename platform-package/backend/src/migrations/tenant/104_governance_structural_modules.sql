-- 104: Governance structural modules
CREATE TABLE IF NOT EXISTS governance_domains (
  domain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  owner_id VARCHAR(64),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS governance_bodies (
  body_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  domain_id UUID REFERENCES governance_domains(domain_id),
  body_type TEXT DEFAULT 'committee' CHECK (body_type IN ('board','committee','subcommittee','working_group','council')),
  name_en TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  chair_user_id VARCHAR(64),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','dissolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS governance_reporting_lines (
  line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  parent_body_id UUID NOT NULL REFERENCES governance_bodies(body_id) ON DELETE CASCADE,
  child_body_id UUID NOT NULL REFERENCES governance_bodies(body_id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'reports_to',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_packs (
  pack_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  meeting_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','assembled','approved','published')),
  prepared_by VARCHAR(64),
  approved_by VARCHAR(64),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS board_pack_items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES board_packs(pack_id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  source_entity_type TEXT,
  source_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_responsibilities (
  responsibility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  category TEXT,
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('low','medium','high','critical')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS governance_responsibility_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsibility_id UUID NOT NULL REFERENCES governance_responsibilities(responsibility_id) ON DELETE CASCADE,
  assignee_type TEXT DEFAULT 'user' CHECK (assignee_type IN ('user','role','team','body')),
  assignee_id VARCHAR(64) NOT NULL,
  scope_type TEXT,
  scope_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_raci_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  process_area TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS governance_raci_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES governance_raci_templates(template_id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  role_or_user TEXT NOT NULL,
  raci_type TEXT NOT NULL CHECK (raci_type IN ('R','A','C','I')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_domains_tenant ON governance_domains(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_bodies_domain ON governance_bodies(domain_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_board_packs_tenant ON board_packs(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_resp_tenant ON governance_responsibilities(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_raci_tenant ON governance_raci_templates(tenant_id) WHERE deleted_at IS NULL;
