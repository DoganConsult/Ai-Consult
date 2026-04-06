-- ============================================================
-- Migration: 400_personal_agent_assignments.sql
-- Purpose: Personal dedicated agent per user with role inheritance,
--          policy-based governance, SLA-based activation, and
--          tenant mode integration (human/hyper/autonomous)
-- Date: 2026-03-20
-- ============================================================

DO $$
BEGIN
    -- Personal Agent Assignment Table
    -- Each user can have a dedicated agent that inherits their roles
    CREATE TABLE IF NOT EXISTS personal_agent_assignments (
        assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        
        -- Agent assignment
        agent_id VARCHAR(64) NOT NULL, -- e.g., "A01", "A02", or custom agent
        agent_name_en VARCHAR(255),
        agent_name_ar VARCHAR(255),
        
        -- Role inheritance (agent inherits user roles)
        inherited_roles VARCHAR(50)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(50)[],
        inherited_permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        
        -- Activation rules (SLA-based, policy-based)
        activation_mode VARCHAR(50) NOT NULL DEFAULT 'human' CHECK (activation_mode IN (
            'human',      -- Human approval required for all actions
            'hyper',     -- Hybrid: agent acts, human reviews
            'autonomous' -- Full autonomous: agent acts independently
        )),
        
        -- SLA-based activation
        sla_based_activation BOOLEAN DEFAULT false,
        sla_threshold_hours INTEGER, -- If task overdue by X hours, agent activates
        sla_priority_filter VARCHAR(20)[], -- Only activate for these priorities
        
        -- Policy-based governance
        company_policy_rules JSONB DEFAULT '{}'::jsonb, -- Policy rules that govern agent actions
        process_governance_rules JSONB DEFAULT '{}'::jsonb, -- Process-specific rules
        
        -- Action scopes (what agent can do)
        allowed_action_types VARCHAR(100)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(100)[],
        blocked_action_types VARCHAR(100)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(100)[],
        
        -- Approval requirements
        requires_approval_for VARCHAR(100)[], -- Action types requiring approval
        auto_approve_below_risk VARCHAR(20) DEFAULT 'low', -- Auto-approve if risk < this
        
        -- Status and lifecycle
        is_active BOOLEAN DEFAULT true,
        is_enabled BOOLEAN DEFAULT true,
        last_activity_at TIMESTAMPTZ,
        total_actions_executed INTEGER DEFAULT 0,
        total_actions_approved INTEGER DEFAULT 0,
        total_actions_rejected INTEGER DEFAULT 0,
        
        -- Consent and compliance
        user_consent_granted BOOLEAN DEFAULT false,
        consent_granted_at TIMESTAMPTZ,
        consent_purpose TEXT,
        consent_revoked_at TIMESTAMPTZ,
        
        -- Metadata
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR(64),
        updated_by VARCHAR(64),
        
        UNIQUE(tenant_id, user_id, agent_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_personal_agent_assignments_user
        ON personal_agent_assignments(tenant_id, user_id, is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_personal_agent_assignments_agent
        ON personal_agent_assignments(tenant_id, agent_id, is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_personal_agent_assignments_mode
        ON personal_agent_assignments(tenant_id, activation_mode, is_enabled);
    
    -- Agent Activity Log (all actions performed by agent on behalf of user)
    CREATE TABLE IF NOT EXISTS agent_activity_log (
        activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        assignment_id UUID NOT NULL REFERENCES personal_agent_assignments(assignment_id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL,
        agent_id VARCHAR(64) NOT NULL,
        
        -- Activity details
        activity_type VARCHAR(100) NOT NULL, -- e.g., "policy.create", "risk.flag", "evidence.upload"
        activity_category VARCHAR(50) NOT NULL, -- "governance", "risk", "compliance", "evidence", etc.
        entity_type VARCHAR(50),
        entity_id VARCHAR(64),
        
        -- Action details
        action_title VARCHAR(255),
        action_description TEXT,
        action_payload JSONB DEFAULT '{}'::jsonb,
        
        -- Process governance
        process_id VARCHAR(100), -- Which GRC process this action belongs to
        process_step VARCHAR(100), -- Which step in the process
        governance_rule_applied VARCHAR(100), -- Which governance rule was applied
        policy_rule_applied VARCHAR(100), -- Which company policy rule was applied
        
        -- SLA context
        sla_deadline TIMESTAMPTZ,
        sla_hours_overdue INTEGER, -- If SLA passed, how many hours overdue
        triggered_by_sla BOOLEAN DEFAULT false, -- Was this triggered because SLA passed?
        
        -- Execution context
        execution_mode VARCHAR(50) NOT NULL, -- "human", "hyper", "autonomous"
        required_approval BOOLEAN DEFAULT false,
        approved_by VARCHAR(64),
        approved_at TIMESTAMPTZ,
        rejected_by VARCHAR(64),
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        
        -- Risk and compliance
        risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
        compliance_check_passed BOOLEAN DEFAULT true,
        compliance_check_details JSONB,
        
        -- Result
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
            'pending', 'approved', 'rejected', 'executing', 'completed', 'failed', 'cancelled'
        )),
        result JSONB,
        error_message TEXT,
        
        -- Audit trail
        executed_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        duration_ms INTEGER,
        
        -- Authentication/Authorization
        auth_token_hash VARCHAR(255), -- Hash of token used for this action
        auth_method VARCHAR(50), -- "delegation_grant", "impersonation_token", "api_key"
        ip_address VARCHAR(45),
        user_agent TEXT,
        
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_user
        ON agent_activity_log(tenant_id, user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_agent
        ON agent_activity_log(tenant_id, agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_status
        ON agent_activity_log(tenant_id, status, created_at DESC) WHERE status IN ('pending', 'approved', 'executing');
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_sla
        ON agent_activity_log(tenant_id, triggered_by_sla, sla_hours_overdue) WHERE triggered_by_sla = true;
    CREATE INDEX IF NOT EXISTS idx_agent_activity_log_process
        ON agent_activity_log(tenant_id, process_id, process_step);
    
    -- Agent Process Governance Rules
    -- Defines which processes agents can participate in and how
    CREATE TABLE IF NOT EXISTS agent_process_governance_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        
        -- Rule identification
        rule_code VARCHAR(100) NOT NULL,
        rule_name_en VARCHAR(255) NOT NULL,
        rule_name_ar VARCHAR(255),
        
        -- Process scope
        process_id VARCHAR(100) NOT NULL, -- e.g., "policy_lifecycle", "risk_assessment", "evidence_collection"
        process_steps VARCHAR(100)[], -- Which steps in the process (empty = all steps)
        
        -- Agent scope
        agent_ids VARCHAR(64)[], -- Which agents this applies to (empty = all agents)
        activation_modes VARCHAR(50)[], -- Which modes this applies to (human/hyper/autonomous)
        
        -- Governance conditions
        requires_approval BOOLEAN DEFAULT true,
        approval_roles VARCHAR(50)[], -- Which roles must approve
        max_risk_level VARCHAR(20) DEFAULT 'medium', -- Max risk level for auto-approval
        
        -- Policy conditions
        policy_conditions JSONB DEFAULT '{}'::jsonb, -- JSONLogic conditions based on company policy
        
        -- SLA conditions
        sla_based_activation BOOLEAN DEFAULT false,
        sla_threshold_hours INTEGER,
        
        -- Enforcement
        enforcement_level VARCHAR(20) NOT NULL DEFAULT 'advisory' CHECK (enforcement_level IN (
            'blocking', 'advisory', 'informational'
        )),
        is_active BOOLEAN DEFAULT true,
        
        -- Lifecycle
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR(64),
        
        UNIQUE(tenant_id, rule_code)
    );
    
    CREATE INDEX IF NOT EXISTS idx_agent_process_governance_rules_process
        ON agent_process_governance_rules(tenant_id, process_id, is_active) WHERE is_active = true;
    
    -- Agent SLA Activation Rules
    -- Defines when agents can activate based on SLA breaches
    CREATE TABLE IF NOT EXISTS agent_sla_activation_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        assignment_id UUID NOT NULL REFERENCES personal_agent_assignments(assignment_id) ON DELETE CASCADE,
        
        -- SLA conditions
        entity_type VARCHAR(50) NOT NULL, -- "task", "evidence", "assessment", "remediation", etc.
        priority_filter VARCHAR(20)[], -- Only activate for these priorities
        hours_overdue_threshold INTEGER NOT NULL DEFAULT 24, -- Activate if X hours overdue
        
        -- Action to take
        action_type VARCHAR(100) NOT NULL, -- What action agent should take
        action_template JSONB, -- Template for the action
        
        -- Approval
        requires_approval BOOLEAN DEFAULT true,
        notify_user BOOLEAN DEFAULT true,
        
        -- Status
        is_active BOOLEAN DEFAULT true,
        last_triggered_at TIMESTAMPTZ,
        trigger_count INTEGER DEFAULT 0,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        UNIQUE(tenant_id, assignment_id, entity_type)
    );
    
    CREATE INDEX IF NOT EXISTS idx_agent_sla_activation_rules_assignment
        ON agent_sla_activation_rules(tenant_id, assignment_id, is_active) WHERE is_active = true;
END $$;

-- Create global process governance rule templates
CREATE TABLE IF NOT EXISTS public.agent_process_governance_rules_global (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(100) NOT NULL UNIQUE,
    rule_name_en VARCHAR(255) NOT NULL,
    rule_name_ar VARCHAR(255),
    process_id VARCHAR(100) NOT NULL,
    process_steps VARCHAR(100)[],
    requires_approval BOOLEAN DEFAULT true,
    approval_roles VARCHAR(50)[],
    max_risk_level VARCHAR(20) DEFAULT ''medium'',
    policy_conditions JSONB DEFAULT ''{}''::jsonb,
    sla_based_activation BOOLEAN DEFAULT false,
    sla_threshold_hours INTEGER,
    enforcement_level VARCHAR(20) NOT NULL DEFAULT ''advisory'',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed example global process governance rules
INSERT INTO public.agent_process_governance_rules_global (
    rule_code, rule_name_en, rule_name_ar, process_id, requires_approval,
    approval_roles, max_risk_level, enforcement_level, is_active
) VALUES
(
    ''POLICY_LIFECYCLE_AUTO_DRAFT'',
    ''Policy Lifecycle - Auto Draft by Agent'',
    ''دورة حياة السياسة - المسودة التلقائية بواسطة الوكيل'',
    ''policy_lifecycle'',
    false, -- Auto-approve draft creation
    ARRAY[''ComplianceManager''],
    ''low'',
    ''advisory'',
    true
),
(
    ''RISK_ASSESSMENT_AUTO_FLAG'',
    ''Risk Assessment - Auto Flag by Agent'',
    ''تقييم المخاطر - الإشارة التلقائية بواسطة الوكيل'',
    ''risk_assessment'',
    true, -- Requires approval for risk flagging
    ARRAY[''RiskManager'', ''TenantAdmin''],
    ''medium'',
    ''blocking'',
    true
),
(
    ''EVIDENCE_COLLECTION_SLA_AUTO'',
    ''Evidence Collection - SLA-Based Auto Collection'',
    ''جمع الأدلة - الجمع التلقائي بناءً على SLA'',
    ''evidence_collection'',
    false, -- Auto if SLA passed
    ARRAY[]::VARCHAR(50)[],
    ''low'',
    ''advisory'',
    true
)
ON CONFLICT (rule_code) DO NOTHING;
