-- Law 2: Platform Entity Abstraction Layer
-- Generic base tables that any product can extend with domain-specific columns.
-- GRC tables (frameworks, risks, policies, controls, evidence_*) are now views or
-- foreign-key linked to these base tables for cross-product interoperability.

-- ── Base entity type registry ──────────────────────────────────────────
-- Declares what kinds of entities exist across all products.
CREATE TABLE IF NOT EXISTS entity_types (
  type_code       VARCHAR(50) PRIMARY KEY,
  product_code    VARCHAR(50) NOT NULL DEFAULT 'agrc',
  display_name_en VARCHAR(200) NOT NULL,
  display_name_ar VARCHAR(200),
  parent_type     VARCHAR(50) REFERENCES entity_types(type_code),
  icon            VARCHAR(50),
  color           VARCHAR(20),
  schema_json     JSONB,  -- JSON Schema for product-specific fields
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed AGRC entity types
INSERT INTO entity_types (type_code, product_code, display_name_en, display_name_ar, icon) VALUES
  ('framework',       'agrc', 'Framework',           'إطار عمل',         'pi-th-large'),
  ('control',         'agrc', 'Control',             'ضابط',              'pi-check-circle'),
  ('risk',            'agrc', 'Risk',                'خطر',               'pi-exclamation-triangle'),
  ('policy',          'agrc', 'Policy',              'سياسة',             'pi-book'),
  ('evidence',        'agrc', 'Evidence',            'دليل',              'pi-folder-open'),
  ('finding',         'agrc', 'Finding',             'ملاحظة',            'pi-search'),
  ('incident',        'agrc', 'Incident',            'حادث',              'pi-bolt'),
  ('vendor',          'agrc', 'Vendor',              'مورد',              'pi-truck'),
  ('assessment',      'agrc', 'Assessment',          'تقييم',             'pi-chart-bar'),
  ('remediation',     'agrc', 'Remediation',         'معالجة',            'pi-wrench'),
  ('obligation',      'agrc', 'Obligation',          'التزام',            'pi-file'),
  ('workflow',        'agrc', 'Workflow',             'سير عمل',           'pi-sitemap'),
  ('action_item',     'agrc', 'Action Item',         'بند إجراء',         'pi-list-check'),
  ('bcp_plan',        'agrc', 'BCP Plan',            'خطة استمرارية',     'pi-shield'),
  ('training',        'agrc', 'Training Program',    'برنامج تدريبي',     'pi-graduation-cap'),
  ('exception',       'agrc', 'Exception',           'استثناء',           'pi-flag'),
  ('audit',           'agrc', 'Audit',               'تدقيق',             'pi-file-pdf'),
  ('committee',       'agrc', 'Committee',           'لجنة',              'pi-users'),
  ('kpi',             'agrc', 'KPI',                 'مؤشر أداء',         'pi-chart-line'),
  ('delegation',      'agrc', 'Delegation',          'تفويض',             'pi-share-alt')
ON CONFLICT (type_code) DO NOTHING;

-- ── Base entity instances ──────────────────────────────────────────────
-- Every domain entity (risk, control, policy, etc.) gets a row here.
-- Product-specific tables (risks, controls, etc.) FK to this.
CREATE TABLE IF NOT EXISTS entity_instances (
  entity_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code       VARCHAR(50) NOT NULL REFERENCES entity_types(type_code),
  tenant_id       VARCHAR(64) NOT NULL,
  product_code    VARCHAR(50) NOT NULL DEFAULT 'agrc',
  display_title   VARCHAR(500),
  status          VARCHAR(50) DEFAULT 'active',
  owner_user_id   VARCHAR(64),
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_instances_type ON entity_instances(type_code);
CREATE INDEX IF NOT EXISTS idx_entity_instances_tenant ON entity_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entity_instances_status ON entity_instances(status);

-- ── Requirements (generic obligations/controls/compliance items) ───────
CREATE TABLE IF NOT EXISTS requirements (
  requirement_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID REFERENCES entity_instances(entity_id),
  source_type     VARCHAR(50) NOT NULL,  -- 'regulatory', 'internal', 'contractual', 'standard'
  source_ref      VARCHAR(200),          -- e.g., 'NCA-ECC-1.2.3', 'ISO27001-A.5.1'
  title_en        VARCHAR(500) NOT NULL,
  title_ar        VARCHAR(500),
  description_en  TEXT,
  description_ar  TEXT,
  priority        VARCHAR(20) DEFAULT 'medium',
  status          VARCHAR(50) DEFAULT 'open',
  due_date        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE requirements ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entity_instances(entity_id);
CREATE INDEX IF NOT EXISTS idx_requirements_entity ON requirements(entity_id);
CREATE INDEX IF NOT EXISTS idx_requirements_source ON requirements(source_type);

DO $$
BEGIN
  -- Requirements
  ALTER TABLE requirements ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entity_instances(entity_id);
  
  -- Obligations
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entity_instances(entity_id);
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS authority_code VARCHAR(100);
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS obligation_type VARCHAR(50);
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS title_en VARCHAR(500);
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS title_ar VARCHAR(500);
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS description_en TEXT;
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS frequency VARCHAR(50);
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
  ALTER TABLE obligations ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN DEFAULT true;
EXCEPTION WHEN others THEN RAISE NOTICE 'Alterations partially failed for requirements/obligations';
END $$;

CREATE INDEX IF NOT EXISTS idx_requirements_entity ON requirements(entity_id);
CREATE INDEX IF NOT EXISTS idx_requirements_source ON requirements(source_type);

CREATE INDEX IF NOT EXISTS idx_obligations_entity ON obligations(entity_id);
CREATE INDEX IF NOT EXISTS idx_obligations_authority ON obligations(authority_code);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON obligations(status);

-- ── Assessments (generic evaluation records) ──────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
  assessment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID REFERENCES entity_instances(entity_id),
  assessment_type VARCHAR(50) NOT NULL DEFAULT 'framework_assessment', -- 'risk_assessment', 'compliance_check', 'audit_review', 'vendor_eval'
  assessor_id     VARCHAR(64),
  score           NUMERIC(5,2),
  max_score       NUMERIC(5,2),
  rating          VARCHAR(50),          -- 'compliant', 'non_compliant', 'partial', 'not_assessed'
  findings_count  INT DEFAULT 0,
  assessed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_review_at  TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entity_instances(entity_id);
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) NOT NULL DEFAULT 'framework_assessment';
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessor_id VARCHAR(64);
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS max_score NUMERIC(5,2);
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS rating VARCHAR(50);
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS findings_count INT DEFAULT 0;
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMPTZ NOT NULL DEFAULT now();
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ;
  ALTER TABLE assessments ADD COLUMN IF NOT EXISTS notes TEXT;
EXCEPTION WHEN others THEN RAISE NOTICE 'Alterations partially failed for assessments';
END $$;

CREATE INDEX IF NOT EXISTS idx_assessments_entity ON assessments(entity_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(assessment_type);

-- ── Artifacts (evidence, documents, attachments linked to entities) ───
CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID REFERENCES entity_instances(entity_id),
  artifact_type   VARCHAR(50) NOT NULL, -- 'evidence', 'document', 'report', 'screenshot', 'certificate'
  title           VARCHAR(500),
  storage_ref     TEXT,                 -- S3 key, file path, or external URL
  mime_type       VARCHAR(100),
  file_size_bytes BIGINT,
  hash_sha256     VARCHAR(64),
  uploaded_by     VARCHAR(64),
  expires_at      TIMESTAMPTZ,
  status          VARCHAR(50) DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entity_instances(entity_id);
END $$;

CREATE INDEX IF NOT EXISTS idx_artifacts_entity ON artifacts(entity_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(artifact_type);

-- ── Entity relationships (cross-entity links) ────────────────────────
CREATE TABLE IF NOT EXISTS entity_relationships (
  relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id UUID NOT NULL REFERENCES entity_instances(entity_id),
  target_entity_id UUID NOT NULL REFERENCES entity_instances(entity_id),
  relationship_type VARCHAR(50) NOT NULL, -- 'controls', 'mitigates', 'evidences', 'requires', 'depends_on', 'feeds_into'
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_entity_rel_source ON entity_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_rel_target ON entity_relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_rel_type ON entity_relationships(relationship_type);
