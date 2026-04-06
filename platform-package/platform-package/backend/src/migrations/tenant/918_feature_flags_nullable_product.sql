-- Migration 917: Make feature_flags.product_code nullable for platform-neutral flags
-- Resolves M2: product_code DEFAULT 'agrc' hard-ties all flags to a single product
-- Platform-level flags should have product_code = NULL

ALTER TABLE feature_flags ALTER COLUMN product_code DROP NOT NULL;
ALTER TABLE feature_flags ALTER COLUMN product_code DROP DEFAULT;

UPDATE feature_flags SET product_code = NULL
  WHERE feature_key NOT LIKE 'agrc_%' AND product_code = 'agrc';
