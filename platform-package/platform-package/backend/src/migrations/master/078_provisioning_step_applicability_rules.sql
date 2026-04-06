-- Migration 078: Add applicability_rule column to provisioning_step_definitions
-- Enables dynamic filtering of provisioning steps based on organizational profile, signals, and context
-- Rules are evaluated against provisioning context (signals, answers, inferred regulators/frameworks, etc.)

-- Add applicability_rule column (JSONB for flexible rule expressions)
ALTER TABLE public.provisioning_step_definitions
  ADD COLUMN IF NOT EXISTS applicability_rule JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.provisioning_step_definitions.applicability_rule IS 
  'JSONB rule expression that determines if this step applies to a given provisioning context. 
   Evaluated against signals, answers, inferred regulators/frameworks, sector, company size, etc.
   If NULL, step always applies (no filtering). 
   Rule format: { "if": { "condition": "value" }, "then": "APPLY" | "SKIP" } or similar JSONLogic/DSL structure.';

-- Create index for steps that have applicability rules (for query optimization)
CREATE INDEX IF NOT EXISTS idx_prov_step_defs_has_rule 
  ON public.provisioning_step_definitions((applicability_rule IS NOT NULL)) 
  WHERE is_active = true;

-- Example: Mark steps that should only run for specific sectors/modules
-- This will be populated by data migrations or admin UI
-- For now, all existing steps have NULL applicability_rule (always apply)
