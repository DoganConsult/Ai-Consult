-- Seed the AGRC product into platform_products so module-guard and activation-steps
-- can resolve product→module mappings. Without this row, computeAllowedModules()
-- returns an empty set and all domain modules get 403 MODULE_NOT_LICENSED.
INSERT INTO public.platform_products (product_key, name_en, name_ar, version, enabled, manifest)
VALUES ('agrc', 'AGRC Platform', 'منصة AGRC', '1.0.0', true, '{"modules":{"agrc":true}}')
ON CONFLICT (product_key) DO UPDATE SET enabled = true, updated_at = now();
