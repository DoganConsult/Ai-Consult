-- ============================================================
-- Migration 372: Expert Packs KSA Arabic Enhancement
-- Adds Arabic language support and KSA regulatory intelligence
-- integration to expert packs
-- ============================================================

-- ═══════════════════════════════════════════════
-- Add Arabic columns to expert_packs
-- ═══════════════════════════════════════════════

ALTER TABLE expert_packs
  ADD COLUMN IF NOT EXISTS domain_objectives_ar JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS thresholds_ar JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS failure_patterns_ar JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS evidence_expectations_ar JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommended_actions_ar JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS executive_summary_style_ar JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS committee_wording_style_ar JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_best_action_templates_ar JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS milestone_hints_ar JSONB DEFAULT '[]';

-- ═══════════════════════════════════════════════
-- Add index for faster lookups
-- ═══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_expert_packs_module ON expert_packs(module_code);

COMMENT ON TABLE expert_packs IS 'Expert knowledge packs for GRC modules with KSA regulatory intelligence and bilingual (EN/AR) support';
COMMENT ON COLUMN expert_packs.domain_objectives_ar IS 'Arabic translations of domain objectives';
COMMENT ON COLUMN expert_packs.thresholds_ar IS 'Arabic translations of threshold descriptions';
COMMENT ON COLUMN expert_packs.failure_patterns_ar IS 'Arabic translations of failure patterns';
COMMENT ON COLUMN expert_packs.evidence_expectations_ar IS 'Arabic translations of evidence expectations';
COMMENT ON COLUMN expert_packs.recommended_actions_ar IS 'Arabic translations of recommended actions';
COMMENT ON COLUMN expert_packs.executive_summary_style_ar IS 'Arabic executive summary style guidelines with KSA context';
COMMENT ON COLUMN expert_packs.committee_wording_style_ar IS 'Arabic committee wording style guidelines';
COMMENT ON COLUMN expert_packs.next_best_action_templates_ar IS 'Arabic next best action templates';
COMMENT ON COLUMN expert_packs.milestone_hints_ar IS 'Arabic milestone hints and descriptions';
