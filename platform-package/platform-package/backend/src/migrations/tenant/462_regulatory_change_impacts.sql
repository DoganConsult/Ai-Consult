-- Action 6: Regulatory Change Impact Modeling
-- Creates detailed impact records linking regulatory changes to controls and obligations
-- Enables traceability: regulatory change → control/obligation → evidence → remediation

CREATE TABLE IF NOT EXISTS regulatory_change_impacts (
  impact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID NOT NULL REFERENCES regulatory_changes(change_id) ON DELETE CASCADE,
  
  -- Impact target (either control or obligation)
  impact_type VARCHAR(30) NOT NULL CHECK (impact_type IN ('control', 'obligation')),
  target_id UUID NOT NULL, -- control_id or obligation_id
  
  -- Impact details
  impact_severity VARCHAR(20) CHECK (impact_severity IN ('critical', 'high', 'medium', 'low')),
  impact_category VARCHAR(50), -- e.g., 'new_requirement', 'modified_requirement', 'removed_requirement', 'clarification'
  impact_description TEXT,
  
  -- Remediation tracking
  remediation_status VARCHAR(30) DEFAULT 'pending' CHECK (remediation_status IN (
    'pending', 'assessed', 'planned', 'in_progress', 'completed', 'not_applicable', 'deferred'
  )),
  remediation_due_date DATE,
  remediation_notes TEXT,
  remediation_task_id UUID, -- Links to process_tasks or action_items
  
  -- Impact assessment metadata
  assessed_by VARCHAR(64), -- User ID
  assessed_at TIMESTAMPTZ,
  assessment_confidence DECIMAL(5,2), -- 0.00 to 1.00
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one impact record per change+target combination
  UNIQUE(change_id, impact_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_reg_change_impacts_change ON regulatory_change_impacts(change_id);
CREATE INDEX IF NOT EXISTS idx_reg_change_impacts_target ON regulatory_change_impacts(impact_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reg_change_impacts_status ON regulatory_change_impacts(remediation_status);
CREATE INDEX IF NOT EXISTS idx_reg_change_impacts_due_date ON regulatory_change_impacts(remediation_due_date) WHERE remediation_due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_change_impacts_severity ON regulatory_change_impacts(impact_severity);

COMMENT ON TABLE regulatory_change_impacts IS 'Detailed impact records linking regulatory changes to controls and obligations. Enables traceability and remediation tracking.';
COMMENT ON COLUMN regulatory_change_impacts.impact_type IS 'Type of impacted entity: control or obligation';
COMMENT ON COLUMN regulatory_change_impacts.target_id IS 'UUID of the affected control or obligation';
COMMENT ON COLUMN regulatory_change_impacts.remediation_task_id IS 'Links to process_tasks or action_items for remediation tracking';
