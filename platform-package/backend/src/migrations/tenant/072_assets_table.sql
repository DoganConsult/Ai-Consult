-- Migration 072: Assets table for asset inventory management
-- Required by: /assets page, asset-control linking

-- Ensure assets table has all required columns (may pre-exist with old schema)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'assets') THEN
    -- Add missing columns to existing table
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS department VARCHAR(255);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS location VARCHAR(255);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS mac_address VARCHAR(100);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS os VARCHAR(200);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS classification VARCHAR(100) DEFAULT 'internal';
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS linked_controls UUID[] DEFAULT '{}';
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS linked_risks UUID[] DEFAULT '{}';
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS assets (
  asset_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(100) NOT NULL DEFAULT 'server',
  description     TEXT DEFAULT '',
  criticality     VARCHAR(50) DEFAULT 'medium',
  owner           VARCHAR(255),
  department      VARCHAR(255),
  location        VARCHAR(255),
  ip_address      VARCHAR(100),
  mac_address     VARCHAR(100),
  os              VARCHAR(200),
  classification  VARCHAR(100) DEFAULT 'internal',
  status          VARCHAR(50) DEFAULT 'active',
  linked_controls UUID[] DEFAULT '{}',
  linked_risks    UUID[] DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  created_by      VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assets_type ON assets (type);
CREATE INDEX IF NOT EXISTS idx_assets_criticality ON assets (criticality);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets (status);
CREATE INDEX IF NOT EXISTS idx_assets_deleted ON assets (deleted_at) WHERE deleted_at IS NULL;
