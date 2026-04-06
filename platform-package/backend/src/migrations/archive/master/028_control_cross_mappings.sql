-- F01: Cross-Regulation Mapping for Regulatory Content Library
CREATE TABLE IF NOT EXISTS public.control_cross_mappings (
  id SERIAL PRIMARY KEY,
  source_control_code VARCHAR(100),
  target_control_code VARCHAR(100),
  mapping_type VARCHAR(50) DEFAULT 'equivalent',
  confidence NUMERIC(3,2) DEFAULT 0.85,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.control_cross_mappings ADD COLUMN IF NOT EXISTS source_control_code VARCHAR(100);
ALTER TABLE public.control_cross_mappings ADD COLUMN IF NOT EXISTS target_control_code VARCHAR(100);
ALTER TABLE public.control_cross_mappings ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2) DEFAULT 0.85;
CREATE INDEX IF NOT EXISTS idx_ccm_source ON public.control_cross_mappings(source_control_code) WHERE source_control_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ccm_target ON public.control_cross_mappings(target_control_code) WHERE target_control_code IS NOT NULL;
