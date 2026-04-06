-- Migration: 399_ai_driven_org_validation_rules.sql
-- Purpose: Create AI-driven, database-driven validation rules system for org structure
--          (NOT hardcoded - fully dynamic, enterprise-grade, world-class)
-- Date: 2026-03-20

DO $$
BEGIN
    -- AI-Driven Validation Rules Table
    -- Rules are stored in DB, evaluated dynamically, not hardcoded
    CREATE TABLE IF NOT EXISTS org_validation_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        
        -- Rule identification
        rule_code VARCHAR(100) NOT NULL,
        rule_name_en VARCHAR(255) NOT NULL,
        rule_name_ar VARCHAR(255),
        rule_category VARCHAR(50) NOT NULL CHECK (rule_category IN (
            'integrity', 'business_rule', 'data_quality', 'compliance', 
            'security', 'governance', 'performance', 'best_practice'
        )),
        
        -- AI-driven evaluation
        condition_type VARCHAR(50) NOT NULL DEFAULT 'sql' CHECK (condition_type IN (
            'sql', 'jsonlogic', 'ai_inference', 'pattern_match', 'ml_model'
        )),
        condition_definition JSONB NOT NULL, -- SQL query, JSONLogic, AI prompt, pattern, or model config
        
        -- Severity and enforcement
        severity VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severity IN (
            'critical', 'error', 'warning', 'info', 'suggestion'
        )),
        enforcement_level VARCHAR(20) NOT NULL DEFAULT 'advisory' CHECK (enforcement_level IN (
            'blocking', 'advisory', 'informational'
        )),
        
        -- AI learning and adaptation
        confidence_threshold DECIMAL(3,2) DEFAULT 0.7, -- Minimum confidence for AI-driven rules
        learning_enabled BOOLEAN DEFAULT true, -- Can this rule learn from patterns?
        historical_accuracy DECIMAL(5,2), -- Track accuracy over time
        false_positive_rate DECIMAL(5,2), -- Track false positives
        
        -- Context and scope
        applies_to_node_types VARCHAR(50)[] NOT NULL, -- Which node types this applies to
        applies_to_operations VARCHAR(50)[] DEFAULT ARRAY['create', 'update', 'delete', 'move'],
        sector_filters VARCHAR(50)[], -- If null, applies to all sectors
        regulator_filters VARCHAR(50)[], -- If null, applies to all regulators
        
        -- AI inference metadata
        ai_model_config JSONB, -- Model name, parameters, prompt template
        signal_patterns JSONB, -- Patterns to detect (like signal-inference.engine.ts)
        inference_chain JSONB, -- Multi-step inference chain
        
        -- Resolution and recommendations
        auto_resolution_enabled BOOLEAN DEFAULT false,
        resolution_action JSONB, -- What to do if rule triggers
        recommendation_template_en TEXT,
        recommendation_template_ar TEXT,
        
        -- Lifecycle
        is_active BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 100, -- Lower = higher priority
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR(64),
        updated_by VARCHAR(64),
        
        UNIQUE(tenant_id, rule_code)
    );

    CREATE INDEX IF NOT EXISTS idx_org_validation_rules_active 
        ON org_validation_rules(tenant_id, is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_org_validation_rules_category 
        ON org_validation_rules(tenant_id, rule_category);
    CREATE INDEX IF NOT EXISTS idx_org_validation_rules_node_types 
        ON org_validation_rules USING GIN(applies_to_node_types);
    CREATE INDEX IF NOT EXISTS idx_org_validation_rules_priority 
        ON org_validation_rules(tenant_id, priority, is_active);

    -- Validation Execution Log (for AI learning)
    CREATE TABLE IF NOT EXISTS org_validation_executions (
        execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        
        rule_id UUID NOT NULL REFERENCES org_validation_rules(rule_id) ON DELETE CASCADE,
        execution_context JSONB NOT NULL, -- What was being validated
        
        -- Execution results
        triggered BOOLEAN NOT NULL,
        confidence DECIMAL(3,2), -- AI confidence if AI-driven
        actual_severity VARCHAR(20), -- Actual severity when triggered
        
        -- AI inference details
        ai_model_used VARCHAR(100),
        ai_reasoning TEXT, -- Why AI triggered this
        signals_detected JSONB, -- Signals that triggered the rule
        
        -- Outcome tracking (for learning)
        was_correct BOOLEAN, -- Was this a true positive?
        user_action VARCHAR(50), -- What user did (fixed, ignored, false_positive)
        resolution_time_seconds INTEGER,
        
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        executed_by VARCHAR(64)
    );

    CREATE INDEX IF NOT EXISTS idx_org_validation_executions_rule 
        ON org_validation_executions(tenant_id, rule_id, executed_at);
    CREATE INDEX IF NOT EXISTS idx_org_validation_executions_learning 
        ON org_validation_executions(tenant_id, rule_id, was_correct) 
        WHERE was_correct IS NOT NULL;

    -- Validation Rule Patterns (AI learns from these)
    CREATE TABLE IF NOT EXISTS org_validation_patterns (
        pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        
        pattern_type VARCHAR(50) NOT NULL, -- anomaly, violation, best_practice_deviation
        pattern_signature JSONB NOT NULL, -- What makes this pattern unique
        pattern_frequency INTEGER DEFAULT 1, -- How often seen
        
        -- AI metadata
        detected_by_ai BOOLEAN DEFAULT false,
        ai_confidence DECIMAL(3,2),
        similar_patterns UUID[], -- Links to similar patterns
        
        first_seen_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_org_validation_patterns_signature 
        ON org_validation_patterns USING GIN(pattern_signature);
END $$;

-- Seed initial AI-driven validation rules (these are examples - all rules should be DB-driven)
-- In production, these would be managed via admin UI or API

INSERT INTO public.org_validation_rules_global (
    rule_code, rule_name_en, rule_name_ar, rule_category, condition_type, 
    condition_definition, severity, enforcement_level, applies_to_node_types,
    is_active, priority
) VALUES
-- Example: AI-driven orphaned node detection (not hardcoded SQL)
(
    'AI_ORPHANED_NODE_DETECTION',
    'AI-Driven Orphaned Node Detection',
    'كشف العقد اليتيمة بواسطة الذكاء الاصطناعي',
    'integrity',
    'ai_inference',
    '{
        "ai_model": "pattern_detection",
        "signals": ["missing_parent_reference", "isolated_node", "broken_hierarchy_chain"],
        "confidence_threshold": 0.85,
        "pattern_matching": true
    }'::jsonb,
    'error',
    'advisory',
    ARRAY['division', 'department', 'team', 'unit'],
    true,
    10
),
-- Example: AI-driven circular reference detection
(
    'AI_CIRCULAR_REFERENCE_DETECTION',
    'AI-Driven Circular Reference Detection',
    'كشف المراجع الدائرية بواسطة الذكاء الاصطناعي',
    'integrity',
    'ai_inference',
    '{
        "ai_model": "graph_analysis",
        "detection_method": "cycle_detection",
        "max_depth_analysis": 10,
        "confidence_threshold": 0.9
    }'::jsonb,
    'error',
    'blocking',
    ARRAY['organization', 'division', 'department', 'team'],
    true,
    5
),
-- Example: AI-driven business rule violation (learns from patterns)
(
    'AI_CRITICAL_DEPT_NO_HEAD',
    'AI-Driven Critical Department Head Validation',
    'التحقق من رئيس القسم الحرج بواسطة الذكاء الاصطناعي',
    'business_rule',
    'ai_inference',
    '{
        "condition": {
            "node_type": "department",
            "metadata.is_critical_function": true,
            "head_user_id": null
        },
        "ai_enhancement": {
            "learn_from_history": true,
            "pattern_matching": true,
            "confidence_boost_on_repeat": true
        }
    }'::jsonb,
    'error',
    'advisory',
    ARRAY['department'],
    true,
    20
),
-- Example: AI-driven data quality anomaly detection
(
    'AI_DATA_QUALITY_ANOMALY',
    'AI-Driven Data Quality Anomaly Detection',
    'كشف شذوذ جودة البيانات بواسطة الذكاء الاصطناعي',
    'data_quality',
    'ml_model',
    '{
        "model_type": "anomaly_detection",
        "features": ["missing_metadata", "inconsistent_status", "duplicate_codes", "invalid_dates"],
        "threshold": 0.75,
        "learning_enabled": true
    }'::jsonb,
    'warning',
    'advisory',
    ARRAY['organization', 'division', 'department', 'team', 'unit'],
    true,
    50
)
ON CONFLICT DO NOTHING;

-- Create global rules template table (for platform-wide rule templates)
CREATE TABLE IF NOT EXISTS public.org_validation_rules_global (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(100) NOT NULL UNIQUE,
    rule_name_en VARCHAR(255) NOT NULL,
    rule_name_ar VARCHAR(255),
    rule_category VARCHAR(50) NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    condition_definition JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL,
    enforcement_level VARCHAR(20) NOT NULL,
    applies_to_node_types VARCHAR(50)[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(rule_code)
);

COMMENT ON TABLE org_validation_rules IS 
    'AI-driven, database-driven validation rules for org structure (NOT hardcoded)';
COMMENT ON TABLE org_validation_executions IS 
    'Execution log for AI learning and accuracy tracking';
COMMENT ON TABLE org_validation_patterns IS 
    'Patterns detected by AI for adaptive learning';
