-- 476: Route Catalog — DB-driven route registry
-- Replaces static ROUTE_CATALOG with DB-driven resolution.
-- Enables per-tenant route activation and dynamic module mounting.

CREATE TABLE IF NOT EXISTS route_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) NOT NULL,
  path VARCHAR(255) NOT NULL,
  method VARCHAR(10) DEFAULT 'ALL' CHECK (method IN ('ALL','GET','POST','PUT','PATCH','DELETE')),
  handler_ref VARCHAR(255) NOT NULL,
  tier VARCHAR(20),
  required_permissions JSONB DEFAULT '[]',
  requires_module_active BOOLEAN DEFAULT true,
  ownership_entity VARCHAR(100),
  rate_limit_tier VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_code, path, method)
);

CREATE INDEX IF NOT EXISTS idx_rc_module ON route_catalog(module_code);
CREATE INDEX IF NOT EXISTS idx_rc_active ON route_catalog(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_route_catalog_updated_at ON route_catalog;
CREATE TRIGGER trg_route_catalog_updated_at BEFORE UPDATE ON route_catalog
  FOR EACH ROW EXECUTE FUNCTION rbac_set_updated_at();
