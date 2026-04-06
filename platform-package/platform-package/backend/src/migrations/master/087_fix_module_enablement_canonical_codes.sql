-- Migration 087: Fix module_enablement_rules to use canonical module codes
-- Aligns with CANONICAL_AGRC_MODULE_CODES in config/canonical-modules.ts

UPDATE public.module_enablement_rules SET module_code = 'compliance' WHERE module_code = 'controls';
UPDATE public.module_enablement_rules SET module_code = 'risk'       WHERE module_code = 'risks';
UPDATE public.module_enablement_rules SET module_code = 'policy'     WHERE module_code = 'policies';
UPDATE public.module_enablement_rules SET module_code = 'vendor'     WHERE module_code = 'vendor_risk';
UPDATE public.module_enablement_rules SET module_code = 'incident'   WHERE module_code = 'incidents';
UPDATE public.module_enablement_rules SET module_code = 'foundation' WHERE module_code = 'tenant_home';
