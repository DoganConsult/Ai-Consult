-- P0 Vendor Extension Tables
-- Fixes runtime errors in vendor-risk-ext.service.ts and vendor-portal.service.ts

CREATE TABLE IF NOT EXISTS vendor_findings (
  finding_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID          NOT NULL,
  workspace_id      UUID,
  title             VARCHAR(255)  NOT NULL,
  description       TEXT,
  severity          VARCHAR(20)   NOT NULL DEFAULT 'medium'
                      CHECK (severity IN ('critical','high','medium','low','informational')),
  status            VARCHAR(30)   NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','remediated','accepted','closed')),
  source            VARCHAR(50)   DEFAULT 'assessment'
                      CHECK (source IN ('assessment','questionnaire','audit','cyber_rating','manual')),
  control_reference VARCHAR(128),
  due_date          DATE,
  remediation_plan  TEXT,
  remediated_at     TIMESTAMPTZ,
  accepted_by       UUID,
  accepted_at       TIMESTAMPTZ,
  acceptance_reason TEXT,
  created_by        UUID,
  assigned_to       UUID,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_findings_vendor    ON vendor_findings (vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_findings_severity  ON vendor_findings (severity, status);
CREATE INDEX IF NOT EXISTS idx_vendor_findings_due       ON vendor_findings (due_date) WHERE status NOT IN ('remediated','accepted','closed');

CREATE TABLE IF NOT EXISTS vendor_documents (
  document_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID          NOT NULL,
  workspace_id      UUID,
  document_type     VARCHAR(50)   NOT NULL DEFAULT 'general'
                      CHECK (document_type IN ('soc2','iso27001','pci_dss','hipaa','nca_ecc','contract','sla','questionnaire','certificate','pentest','other','general')),
  title             VARCHAR(255)  NOT NULL,
  file_name         VARCHAR(255),
  file_url          TEXT,
  file_hash         VARCHAR(64),
  file_size_bytes   BIGINT,
  mime_type         VARCHAR(100),
  issue_date        DATE,
  expiry_date       DATE,
  issuer            VARCHAR(255),
  scope             TEXT,
  status            VARCHAR(20)   NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','expired','revoked','pending_review')),
  verified          BOOLEAN       NOT NULL DEFAULT FALSE,
  verified_by       UUID,
  verified_at       TIMESTAMPTZ,
  uploaded_by       UUID,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor  ON vendor_documents (vendor_id, document_type);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_expiry  ON vendor_documents (expiry_date, status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS vendor_shared_responsibility (
  responsibility_id UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID          NOT NULL,
  workspace_id      UUID,
  control_id        VARCHAR(128),
  control_title     VARCHAR(255),
  framework_code    VARCHAR(50),
  customer_scope    TEXT,
  vendor_scope      TEXT,
  shared_scope      TEXT,
  ownership         VARCHAR(20)   NOT NULL DEFAULT 'shared'
                      CHECK (ownership IN ('customer','vendor','shared')),
  customer_status   VARCHAR(30)   DEFAULT 'not_started',
  vendor_status     VARCHAR(30)   DEFAULT 'not_started',
  last_reviewed_at  TIMESTAMPTZ,
  next_review_date  DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vsr_vendor     ON vendor_shared_responsibility (vendor_id);
CREATE INDEX IF NOT EXISTS idx_vsr_control    ON vendor_shared_responsibility (control_id);

CREATE TABLE IF NOT EXISTS vendor_subcontractors (
  subcontractor_id  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID          NOT NULL,
  workspace_id      UUID,
  name              VARCHAR(255)  NOT NULL,
  website           VARCHAR(500),
  country           VARCHAR(100),
  services_provided TEXT,
  data_access       BOOLEAN       NOT NULL DEFAULT FALSE,
  data_types        JSONB         DEFAULT '[]',
  risk_tier         VARCHAR(20)   NOT NULL DEFAULT 'medium'
                      CHECK (risk_tier IN ('critical','high','medium','low')),
  status            VARCHAR(20)   NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','under_review','terminated')),
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  review_date       DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_subcontractors_vendor ON vendor_subcontractors (vendor_id, status);
