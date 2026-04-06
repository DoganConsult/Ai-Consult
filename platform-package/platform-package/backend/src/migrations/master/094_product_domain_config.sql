-- ============================================================================
-- Migration 046: Product Domain Configuration
-- ============================================================================
-- Adds domain routing and landing configuration to platform_products.
-- Enables multi-domain/multi-product routing (e.g., agrc.example.com vs qiyas.example.com).
-- ============================================================================

ALTER TABLE public.platform_products ADD COLUMN IF NOT EXISTS domains TEXT[] DEFAULT '{}';
ALTER TABLE public.platform_products ADD COLUMN IF NOT EXISTS default_domain VARCHAR(255);
ALTER TABLE public.platform_products ADD COLUMN IF NOT EXISTS landing_route VARCHAR(255) DEFAULT '/workspace-home';

-- Seed default domains for AGRC product
UPDATE public.platform_products
SET domains = ARRAY['agrc'],
    landing_route = '/workspace-home'
WHERE product_key = 'agrc'
  AND (domains IS NULL OR domains = '{}');
