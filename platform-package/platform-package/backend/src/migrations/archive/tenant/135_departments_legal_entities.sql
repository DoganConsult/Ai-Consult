CREATE TABLE IF NOT EXISTS departments (
  dept_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu_id           UUID NOT NULL,
  name_en         VARCHAR(255) NOT NULL,
  name_ar         VARCHAR(255),
  code            VARCHAR(50),
  head_user_id    VARCHAR(64),
  status          VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      VARCHAR(64),
  updated_by      VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS legal_entities (
  entity_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en         VARCHAR(500) NOT NULL,
  name_ar         VARCHAR(500),
  entity_type     VARCHAR(100) DEFAULT 'subsidiary',
  registration_no VARCHAR(200),
  country         VARCHAR(100),
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
