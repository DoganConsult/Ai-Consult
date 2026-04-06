-- Migration 216: Multi-Dimensional Organization Structure (MDOS)
-- Allows entities to be classified across multiple organizational dimensions
-- (geography, product line, regulatory jurisdiction, etc.)

CREATE TABLE IF NOT EXISTS org_dimensions (
  dimension_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  code           VARCHAR(80) NOT NULL,
  name_en        VARCHAR(200) NOT NULL,
  name_ar        VARCHAR(200),
  description_en TEXT,
  description_ar TEXT,
  is_system      BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order     INT NOT NULL DEFAULT 0,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS org_dimension_values (
  value_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id   UUID NOT NULL REFERENCES org_dimensions(dimension_id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL,
  code           VARCHAR(80) NOT NULL,
  label_en       VARCHAR(200) NOT NULL,
  label_ar       VARCHAR(200),
  parent_value_id UUID REFERENCES org_dimension_values(value_id),
  metadata       JSONB DEFAULT '{}',
  sort_order     INT NOT NULL DEFAULT 0,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dimension_id, code)
);

CREATE TABLE IF NOT EXISTS entity_dimension_assignments (
  assignment_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  entity_type    VARCHAR(80) NOT NULL,
  entity_id      VARCHAR(200) NOT NULL,
  dimension_id   UUID NOT NULL REFERENCES org_dimensions(dimension_id) ON DELETE CASCADE,
  value_id       UUID NOT NULL REFERENCES org_dimension_values(value_id) ON DELETE CASCADE,
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by     VARCHAR(200),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, entity_type, entity_id, dimension_id, value_id)
);

CREATE INDEX IF NOT EXISTS idx_eda_entity ON entity_dimension_assignments (tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_eda_dimension ON entity_dimension_assignments (dimension_id, value_id);
CREATE INDEX IF NOT EXISTS idx_odv_dimension ON org_dimension_values (dimension_id);

-- Seed 3 default dimensions
INSERT INTO org_dimensions (tenant_id, code, name_en, name_ar, description_en, is_system, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'geography', 'Geography', 'الجغرافيا', 'Geographic regions and locations', TRUE, 1),
  ('00000000-0000-0000-0000-000000000000', 'product_line', 'Product Line', 'خط المنتجات', 'Business product or service lines', TRUE, 2),
  ('00000000-0000-0000-0000-000000000000', 'regulatory_jurisdiction', 'Regulatory Jurisdiction', 'الاختصاص التنظيمي', 'Regulatory jurisdictions and authorities', TRUE, 3)
ON CONFLICT DO NOTHING;
