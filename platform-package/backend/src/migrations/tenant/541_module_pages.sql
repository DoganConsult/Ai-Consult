-- 475: Module Pages — DB-driven page registry
-- Replaces static PAGE_REGISTRY in frontend with DB-driven resolution.
-- Enables per-tenant page customization and dynamic navigation.

CREATE TABLE IF NOT EXISTS module_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_code VARCHAR(100) NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  route VARCHAR(255) NOT NULL,
  layout VARCHAR(20) DEFAULT 'full' CHECK (layout IN ('full','split','wizard','detail','hub')),
  requires_permissions JSONB NOT NULL DEFAULT '[]',
  requires_module_active BOOLEAN DEFAULT true,
  nav_visibility VARCHAR(20) DEFAULT 'entitled' CHECK (nav_visibility IN ('always','entitled','hidden')),
  archetype_visibility JSONB DEFAULT '[]',
  label_en VARCHAR(255),
  label_ar VARCHAR(255),
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, page_code)
);

CREATE INDEX IF NOT EXISTS idx_mp_module ON module_pages(module_code);
CREATE INDEX IF NOT EXISTS idx_mp_route ON module_pages(route);
CREATE INDEX IF NOT EXISTS idx_mp_active ON module_pages(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_module_pages_updated_at ON module_pages;
CREATE TRIGGER trg_module_pages_updated_at BEFORE UPDATE ON module_pages
  FOR EACH ROW EXECUTE FUNCTION rbac_set_updated_at();
