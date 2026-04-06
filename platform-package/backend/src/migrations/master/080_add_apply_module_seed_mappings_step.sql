-- Migration 080: Add apply_module_seed_mappings provisioning step
-- This step applies onboarding_seed_mappings for all enabled modules during provisioning.
-- It runs after seed_org_structure (sequence 7) and before seed_frameworks (previously sequence 8).

-- First, shift all steps with sequence_no >= 8 by 1 to make room for the new step
UPDATE public.provisioning_step_definitions
SET sequence_no = sequence_no + 1
WHERE sequence_no >= 8;

-- Insert the new step at sequence 8
INSERT INTO public.provisioning_step_definitions (id, step_code, step_name, step_name_ar, sequence_no, product_key) VALUES
  (gen_random_uuid(), 'apply_module_seed_mappings', 'Apply module seed mappings', 'تطبيق تعيينات البذور للوحدات', 8, 'agrc')
ON CONFLICT (step_code) DO UPDATE SET
  step_name = EXCLUDED.step_name,
  step_name_ar = EXCLUDED.step_name_ar,
  sequence_no = EXCLUDED.sequence_no,
  product_key = EXCLUDED.product_key;
