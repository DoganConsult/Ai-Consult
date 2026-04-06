INSERT INTO public.platform_products (product_key, name_en, version, enabled, manifest)
VALUES ('agrc', 'AGRC Product Pack', '1.0.0', true, '{"modules":{"agrc":true}}')
ON CONFLICT (product_key) DO UPDATE SET enabled = true, updated_at = now();

UPDATE public.tenant_module_entitlements
SET
  grc_enabled = true,
  licensed_modules = CASE
    WHEN licensed_modules IS NULL OR licensed_modules = '[]'::jsonb
    THEN '["grc"]'::jsonb
    ELSE licensed_modules
  END
WHERE licensed_modules IS NULL
   OR licensed_modules = '[]'::jsonb
   OR grc_enabled = false;
