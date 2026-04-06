-- ============================================================================
-- MIGRATION: Table System Categorization Flags
-- Purpose: Categorize all 253 tables into Platform, GRC, or Qiya systems
-- Date: 2026-03-02
-- ============================================================================

-- Create table to track system categorization
CREATE TABLE IF NOT EXISTS table_system_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name VARCHAR(100) NOT NULL DEFAULT 'public',
    table_name VARCHAR(100) NOT NULL,
    system_category VARCHAR(50) NOT NULL CHECK (system_category IN ('Platform', 'GRC', 'Qiya')),
    module_name VARCHAR(100),
    description TEXT,
    is_multi_tenant BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(schema_name, table_name)
);

-- Add index for quick lookups
CREATE INDEX idx_table_system_flags_category ON table_system_flags(system_category);
CREATE INDEX idx_table_system_flags_module ON table_system_flags(module_name);

-- ============================================================================
-- PLATFORM TABLES (Core platform functionality - 95 tables)
-- ============================================================================

INSERT INTO table_system_flags (schema_name, table_name, system_category, module_name, description, is_multi_tenant) VALUES
-- User & Authentication (11 tables)
('public', 'users', 'Platform', 'Auth', 'User accounts and authentication', false),
('public', 'user_activities', 'Platform', 'Auth', 'User activity tracking', false),
('public', 'user_favorites', 'Platform', 'Auth', 'User favorites and bookmarks', false),
('public', 'user_mfa', 'Platform', 'Auth', 'Multi-factor authentication settings', false),
('public', 'user_preferences', 'Platform', 'Auth', 'User preferences and settings', true),
('public', 'user_roles', 'Platform', 'Auth', 'User role assignments', true),
('public', 'user_function_overrides', 'Platform', 'Auth', 'Function permission overrides', true),
('public', 'login_attempts', 'Platform', 'Auth', 'Login attempt tracking', false),
('public', 'email_verification_tokens', 'Platform', 'Auth', 'Email verification tokens', false),
('public', 'password_reset_tokens', 'Platform', 'Auth', 'Password reset tokens', false),
('public', 'first_visits', 'Platform', 'Auth', 'First visit tracking', false),

-- Tenancy (6 tables)
('public', 'tenants', 'Platform', 'Tenancy', 'Tenant organizations', false),
('public', 'tenant_settings', 'Platform', 'Tenancy', 'Tenant configuration settings', false),
('public', 'tenant_sso_config', 'Platform', 'Tenancy', 'SSO configuration per tenant', false),
('public', 'tenant_user_memberships', 'Platform', 'Tenancy', 'User-tenant relationships', false),
('public', 'tenant_regulatory_profile', 'Platform', 'Tenancy', 'Tenant regulatory requirements', false),
('public', 'company_profiles', 'Platform', 'Tenancy', 'Company profile information', false),

-- Authorization & Roles (9 tables)
('public', 'roles', 'Platform', 'Authorization', 'System roles', true),
('public', 'role_functions', 'Platform', 'Authorization', 'Role function mappings', true),
('public', 'role_function_map', 'Platform', 'Authorization', 'Role to function mappings', true),
('public', 'function_authorities', 'Platform', 'Authorization', 'Function authorities', true),
('public', 'authority_matrix', 'Platform', 'Authorization', 'Authority delegation matrix', true),
('public', 'department_roles', 'Platform', 'Authorization', 'Department role assignments', true),
('public', 'authorization_audit_log', 'Platform', 'Authorization', 'Authorization audit trail', true),
('public', 'authorization_mismatch_log', 'Platform', 'Authorization', 'Authorization mismatch logging', true),
('public', 'approval_chains', 'Platform', 'Authorization', 'Approval chain configuration', true),

-- Provisioning & Deployment (4 tables)
('public', 'provisioning_jobs', 'Platform', 'Provisioning', 'Provisioning job tracking', false),
('public', 'provisioning_steps', 'Platform', 'Provisioning', 'Provisioning step execution', false),
('public', 'provisioning_step_definitions', 'Platform', 'Provisioning', 'Step definitions', false),
('public', 'provisioning_events', 'Platform', 'Provisioning', 'Provisioning events', false),

-- Notifications & Communication (3 tables)
('public', 'notification_preferences', 'Platform', 'Notifications', 'User notification preferences', false),
('public', 'activity_notifications', 'Platform', 'Notifications', 'Activity notifications', false),
('public', 'nudges', 'Platform', 'Notifications', 'User nudges and reminders', false),

-- Workflow Engine (4 tables)
('public', 'workflow_timeline_entries', 'Platform', 'Workflow', 'Workflow timeline tracking', true),
('public', 'autonomous_workflow_config', 'Platform', 'Workflow', 'Autonomous workflow configuration', true),
('public', 'auto_task_config', 'Platform', 'Workflow', 'Automated task configuration', true),
('public', 'roadmap_tasks', 'Platform', 'Workflow', 'Roadmap task tracking', true),

-- AI & Agents (9 tables)
('public', 'ai_sessions', 'Platform', 'AI', 'AI session tracking', false),
('public', 'ai_step_executions', 'Platform', 'AI', 'AI step execution logs', false),
('public', 'ai_step_feedback', 'Platform', 'AI', 'AI step feedback', false),
('public', 'agent_collaboration_metrics', 'Platform', 'AI', 'Agent collaboration metrics', false),
('public', 'agent_performance', 'Platform', 'AI', 'Agent performance metrics', false),
('public', 'agent_suggestions', 'Platform', 'AI', 'Agent suggestions', false),
('public', 'agent_status_log', 'Platform', 'AI', 'Agent status logging', false),
('public', 'ai_agent_status_log', 'Platform', 'AI', 'AI agent status logs', false),
('public', 'contextual_suggestions', 'Platform', 'AI', 'Contextual AI suggestions', false),

-- System & Infrastructure (20 tables)
('public', 'schema_migrations', 'Platform', 'System', 'Database migration tracking', false),
('public', 'seed_history', 'Platform', 'System', 'Database seed tracking', false),
('public', 'job_registry', 'Platform', 'System', 'Background job registry', false),
('public', 'job_executions', 'Platform', 'System', 'Job execution tracking', false),
('public', 'websocket_event_queue', 'Platform', 'System', 'WebSocket event queue', false),
('public', 'telemetry_signals', 'Platform', 'System', 'Telemetry data collection', false),
('public', 'command_history', 'Platform', 'System', 'Command execution history', false),
('public', 'command_palette_history', 'Platform', 'System', 'Command palette usage', false),
('public', 'rate_limit_hits', 'Platform', 'System', 'Rate limiting tracking', false),
('public', 'change_log', 'Platform', 'System', 'System change logging', false),
('public', 'inline_edit_history', 'Platform', 'System', 'Inline edit tracking', false),
('public', 'migration_config', 'Platform', 'System', 'Migration configuration', false),
('public', 'seeding_depth_config', 'Platform', 'System', 'Data seeding configuration', false),
('public', 'search_index_config', 'Platform', 'System', 'Search index configuration', false),
('public', 'saved_searches', 'Platform', 'System', 'Saved search queries', false),
('public', 'recent_searches', 'Platform', 'System', 'Recent search history', false),
('public', 'provisioning_job_lookup', 'Platform', 'System', 'Provisioning job lookups', false),
('public', 'config_entry_sources', 'Platform', 'System', 'Configuration sources', false),
('public', 'edition_limits', 'Platform', 'System', 'Edition feature limits', false),
('public', 'tier_definitions', 'Platform', 'System', 'Tier definitions', false),

-- Activity & Analytics (5 tables)
('public', 'activity_feed', 'Platform', 'Analytics', 'Activity feed entries', false),
('public', 'nudge_feedback', 'Platform', 'Analytics', 'Nudge feedback tracking', false),
('public', 'journey_state', 'Platform', 'Analytics', 'User journey tracking', false),
('public', 'standup_digests', 'Platform', 'Analytics', 'Standup digest tracking', false),
('public', 'war_rooms', 'Platform', 'Analytics', 'War room sessions', false),

-- Billing & Subscriptions (4 tables)
('public', 'subscriptions', 'Platform', 'Billing', 'Subscription management', false),
('public', 'payments', 'Platform', 'Billing', 'Payment records', false),
('public', 'quotes', 'Platform', 'Billing', 'Quote generation', false),
('public', 'trial_extension_requests', 'Platform', 'Billing', 'Trial extension requests', false),

-- Content Management (3 tables)
('public', 'content_packs', 'Platform', 'Content', 'Content pack management', false),
('public', 'landing_content', 'Platform', 'Content', 'Landing page content', false),
('public', 'lead_captures', 'Platform', 'Content', 'Lead capture forms', false),

-- Teams & Organization (7 tables)
('public', 'teams', 'Platform', 'Organization', 'Team structures', true),
('public', 'team_members', 'Platform', 'Organization', 'Team membership', true),
('public', 'team_recommendations', 'Platform', 'Organization', 'Team AI recommendations', true),
('public', 'organization_units', 'Platform', 'Organization', 'Organizational units', true),
('public', 'org_hierarchy', 'Platform', 'Organization', 'Organization hierarchy', true),
('public', 'workspace_profile', 'Platform', 'Organization', 'Workspace profiles', true),
('public', 'workspace_activation_log', 'Platform', 'Organization', 'Workspace activation logs', true),

-- Integration & Connectors (6 tables)
('public', 'integrations', 'Platform', 'Integration', 'External integrations', false),
('public', 'erp_connections', 'Platform', 'Integration', 'ERP system connections', false),
('public', 'erp_field_mappings', 'Platform', 'Integration', 'ERP field mappings', false),
('public', 'erp_sync_history', 'Platform', 'Integration', 'ERP sync history', false),
('public', 'entity_links', 'Platform', 'Integration', 'Entity relationship links', false),
('public', 'entity_link_metadata', 'Platform', 'Integration', 'Entity link metadata', false);

-- ============================================================================
-- GRC TABLES (Governance, Risk, Compliance - 108 tables)
-- ============================================================================

INSERT INTO table_system_flags (schema_name, table_name, system_category, module_name, description, is_multi_tenant) VALUES
-- Regulatory & Compliance (15 tables)
('public', 'regulatory_frameworks', 'GRC', 'Compliance', 'Regulatory framework definitions', false),
('public', 'framework_versions', 'GRC', 'Compliance', 'Framework version tracking', false),
('public', 'framework_relationships', 'GRC', 'Compliance', 'Framework relationships', false),
('public', 'regulatory_controls', 'GRC', 'Compliance', 'Regulatory control requirements', false),
('public', 'control_domains', 'GRC', 'Compliance', 'Control domain groupings', false),
('public', 'control_requirements', 'GRC', 'Compliance', 'Detailed control requirements', false),
('public', 'control_cross_mappings', 'GRC', 'Compliance', 'Cross-framework control mappings', false),
('public', 'compliance_mappings', 'GRC', 'Compliance', 'Compliance requirement mappings', false),
('public', 'compliance_risks', 'GRC', 'Compliance', 'Compliance risk assessments', false),
('public', 'regulatory_deltas', 'GRC', 'Compliance', 'Regulatory change tracking', false),
('public', 'regulatory_delta_impacts', 'GRC', 'Compliance', 'Regulatory change impacts', false),
('public', 'cross_mappings', 'GRC', 'Compliance', 'General cross mappings', false),
('public', 'exception_management', 'GRC', 'Compliance', 'Compliance exceptions', true),
('public', 'regulator_requests', 'GRC', 'Compliance', 'Regulator information requests', true),
('public', 'regulators', 'GRC', 'Compliance', 'Regulator entities', false),

-- Evidence & Documentation (6 tables)
('public', 'evidence_requirements', 'GRC', 'Evidence', 'Evidence requirements', false),
('public', 'evidence_config', 'GRC', 'Evidence', 'Evidence configuration', false),
('public', 'evidence_lifecycle', 'GRC', 'Evidence', 'Evidence lifecycle tracking', false),
('public', 'evidence_relay_queue', 'GRC', 'Evidence', 'Evidence relay queue', false),
('public', 'data_governance_config', 'GRC', 'Evidence', 'Data governance configuration', false),
('public', 'data_classifications', 'GRC', 'Evidence', 'Data classification levels', false),

-- Risk Management (6 tables)
('public', 'governance_risk_appetite', 'GRC', 'Risk', 'Risk appetite statements', true),
('public', 'risk_criteria', 'GRC', 'Risk', 'Risk assessment criteria', true),
('public', 'risk_pair_reviews', 'GRC', 'Risk', 'Risk pair review process', true),
('public', 'kri_config', 'GRC', 'Risk', 'Key Risk Indicator configuration', true),
('public', 'escalation_rules', 'GRC', 'Risk', 'Risk escalation rules', true),
('public', 'escalation_thresholds', 'GRC', 'Risk', 'Escalation thresholds', true),

-- Audit Management (11 tables)
('public', 'audit_schedules', 'GRC', 'Audit', 'Audit scheduling', true),
('public', 'audit_findings', 'GRC', 'Audit', 'Audit finding records', true),
('public', 'audit_prep_checklists', 'GRC', 'Audit', 'Audit preparation checklists', true),
('public', 'agrc_event_log', 'GRC', 'Audit', 'AGRC event logging', true),
('public', 'agrc_os_cycle_log', 'GRC', 'Audit', 'AGRC OS cycle logging', true),
('public', 'ccm_cycle_log', 'GRC', 'Audit', 'CCM cycle logging', true),
('public', 'engagement_os_cycle_log', 'GRC', 'Audit', 'Engagement OS cycle logs', true),
('public', 'enforcement_gate_log', 'GRC', 'Audit', 'Enforcement gate logs', true),
('public', 'handoff_log', 'GRC', 'Audit', 'Handoff logging', true),
('public', 'intervention_audit_log', 'GRC', 'Audit', 'Intervention audit logs', true),
('public', 'report_shares', 'GRC', 'Audit', 'Report sharing tracking', true),

-- Assessment Management (4 tables)
('public', 'maturity_assessments', 'GRC', 'Assessment', 'Maturity assessments', true),
('public', 'maturity_questions', 'GRC', 'Assessment', 'Maturity assessment questions', false),
('public', 'maturity_snapshots', 'GRC', 'Assessment', 'Maturity snapshots', true),
('public', 'vendor_assessments', 'GRC', 'Assessment', 'Vendor risk assessments', true),

-- Vendor Management (2 tables)
('public', 'vendor_engagement_scores', 'GRC', 'Vendor', 'Vendor engagement scoring', true),
('public', 'training_schedules', 'GRC', 'Vendor', 'Vendor training schedules', true),

-- Policy Management (2 tables)
('public', 'sop_procedures', 'GRC', 'Policy', 'Standard operating procedures', true),
('public', 'governance_config', 'GRC', 'Policy', 'Governance configuration', true),

-- Incident Management (2 tables)
('public', 'incident_categories', 'GRC', 'Incident', 'Incident categorization', true),
('public', 'bcp_config', 'GRC', 'Incident', 'Business continuity planning', true),

-- Instrument Management (2 tables)
('public', 'instruments', 'GRC', 'Instrument', 'GRC instruments', true),
('public', 'instrument_structure', 'GRC', 'Instrument', 'Instrument structure definitions', true),

-- RACI & Accountability (2 tables)
('public', 'raci_config', 'GRC', 'RACI', 'RACI matrix configuration', true),
('public', 'pending_assignment_queue', 'GRC', 'RACI', 'Pending assignment queue', true),

-- Metrics & Scoring (4 tables)
('public', 'agrc_metrics_snapshots', 'GRC', 'Metrics', 'AGRC metrics snapshots', true),
('public', 'score_calibrations', 'GRC', 'Metrics', 'Score calibration settings', true),
('public', 'lifecycle_checkpoints', 'GRC', 'Metrics', 'Lifecycle checkpoints', true),
('public', 'lifecycle_template_injections', 'GRC', 'Metrics', 'Lifecycle template injections', true),

-- Approval & Decision (4 tables)
('public', 'approval_requests', 'GRC', 'Approval', 'Approval requests', true),
('public', 'approval_decisions', 'GRC', 'Approval', 'Approval decisions', true),
('public', 'approval_pre_screens', 'GRC', 'Approval', 'Approval pre-screening', true),
('public', 'triage_proposals', 'GRC', 'Approval', 'Triage proposals', true),

-- Reference Data - GRC Specific (50 tables)
('public', 'lookup_approval_authorities', 'GRC', 'Reference', 'Approval authority types', false),
('public', 'lookup_approval_models', 'GRC', 'Reference', 'Approval model types', false),
('public', 'lookup_authority_frameworks', 'GRC', 'Reference', 'Authority frameworks', false),
('public', 'lookup_authority_sector_mapping', 'GRC', 'Reference', 'Authority sector mappings', false),
('public', 'lookup_automation_levels', 'GRC', 'Reference', 'Control automation levels', false),
('public', 'lookup_cloud_providers', 'GRC', 'Reference', 'Cloud provider types', false),
('public', 'lookup_control_testing', 'GRC', 'Reference', 'Control testing methods', false),
('public', 'lookup_data_classifications', 'GRC', 'Reference', 'Data classification levels', false),
('public', 'lookup_data_residency', 'GRC', 'Reference', 'Data residency requirements', false),
('public', 'lookup_data_sources', 'GRC', 'Reference', 'Data source tracking', false),
('public', 'lookup_escalation_models', 'GRC', 'Reference', 'Escalation models', false),
('public', 'lookup_finding_categories', 'GRC', 'Reference', 'Audit finding categories', false),
('public', 'lookup_frameworks', 'GRC', 'Reference', 'Framework definitions', false),
('public', 'lookup_frequencies', 'GRC', 'Reference', 'Control frequency types', false),
('public', 'lookup_gdpr_levels', 'GRC', 'Reference', 'GDPR compliance levels', false),
('public', 'lookup_grc_tools', 'GRC', 'Reference', 'GRC tool types', false),
('public', 'lookup_incident_categories', 'GRC', 'Reference', 'Incident categories', false),
('public', 'lookup_isic4_sectors', 'GRC', 'Reference', 'ISIC4 sector codes', false),
('public', 'lookup_ksa_regulatory_authorities', 'GRC', 'Reference', 'KSA regulatory authorities', false),
('public', 'lookup_maturity_levels', 'GRC', 'Reference', 'Maturity level definitions', false),
('public', 'lookup_nca_sectors', 'GRC', 'Reference', 'NCA sector classifications', false),
('public', 'lookup_outsourced_functions', 'GRC', 'Reference', 'Outsourced function types', false),
('public', 'lookup_pci_levels', 'GRC', 'Reference', 'PCI compliance levels', false),
('public', 'lookup_pdpl_scopes', 'GRC', 'Reference', 'PDPL scope definitions', false),
('public', 'lookup_register_formats', 'GRC', 'Reference', 'Register format types', false),
('public', 'lookup_reporting_obligations', 'GRC', 'Reference', 'Reporting obligations', false),
('public', 'lookup_risk_appetites', 'GRC', 'Reference', 'Risk appetite levels', false),
('public', 'lookup_risk_methodologies', 'GRC', 'Reference', 'Risk assessment methods', false),
('public', 'lookup_sla_tiers', 'GRC', 'Reference', 'SLA tier definitions', false),
('public', 'lookup_team_control_mapping', 'GRC', 'Reference', 'Team control mappings', false),
('public', 'lookup_team_framework_mapping', 'GRC', 'Reference', 'Team framework mappings', false),
('public', 'lookup_team_functions', 'GRC', 'Reference', 'Team function definitions', false),
('public', 'lookup_transfer_mechanisms', 'GRC', 'Reference', 'Data transfer mechanisms', false);

-- ============================================================================
-- QIYA TABLES (Qiya-specific functionality - 50 tables)
-- ============================================================================

INSERT INTO table_system_flags (schema_name, table_name, system_category, module_name, description, is_multi_tenant) VALUES
-- Onboarding System (23 tables)
('public', 'onboarding_activity_log', 'Qiya', 'Onboarding', 'Onboarding activity tracking', true),
('public', 'onboarding_answer_history', 'Qiya', 'Onboarding', 'Answer history tracking', true),
('public', 'onboarding_answers', 'Qiya', 'Onboarding', 'Current onboarding answers', true),
('public', 'onboarding_answers_legacy_v1', 'Qiya', 'Onboarding', 'Legacy answer format', true),
('public', 'onboarding_blockers', 'Qiya', 'Onboarding', 'Onboarding blockers', true),
('public', 'onboarding_dynamic_lookups', 'Qiya', 'Onboarding', 'Dynamic lookup configuration', false),
('public', 'onboarding_field_guidance', 'Qiya', 'Onboarding', 'Field-level guidance', false),
('public', 'onboarding_notifications', 'Qiya', 'Onboarding', 'Onboarding notifications', true),
('public', 'onboarding_progress', 'Qiya', 'Onboarding', 'Progress tracking', true),
('public', 'onboarding_question_bank', 'Qiya', 'Onboarding', 'Question bank', false),
('public', 'onboarding_question_options', 'Qiya', 'Onboarding', 'Question options', false),
('public', 'onboarding_question_types', 'Qiya', 'Onboarding', 'Question type definitions', false),
('public', 'onboarding_questions', 'Qiya', 'Onboarding', 'Question definitions', false),
('public', 'onboarding_recommendations', 'Qiya', 'Onboarding', 'AI recommendations', true),
('public', 'onboarding_scores', 'Qiya', 'Onboarding', 'Onboarding scores', true),
('public', 'onboarding_sections', 'Qiya', 'Onboarding', 'Section definitions', false),
('public', 'onboarding_sessions', 'Qiya', 'Onboarding', 'Session tracking', true),
('public', 'onboarding_stage_definitions', 'Qiya', 'Onboarding', 'Stage definitions', false),
('public', 'onboarding_stages', 'Qiya', 'Onboarding', 'Stage configuration', false),
('public', 'onboarding_translations', 'Qiya', 'Onboarding', 'Multi-language translations', false),
('public', 'onboarding_ui_config', 'Qiya', 'Onboarding', 'UI configuration', false),
('public', 'onboarding_user_answers', 'Qiya', 'Onboarding', 'User answer storage', true),
('public', 'workspace_onboarding_links', 'Qiya', 'Onboarding', 'Workspace onboarding links', true),

-- Questionnaires & Forms (1 table)
('public', 'questionnaires', 'Qiya', 'Forms', 'Dynamic questionnaires', true),

-- Roadmaps & Planning (1 table)
('public', 'roadmaps', 'Qiya', 'Planning', 'Compliance roadmaps', true),

-- Collaborative Features (2 tables)
('public', 'co_draft_sessions', 'Qiya', 'Collaboration', 'Collaborative drafting sessions', true),
('public', 'engagement_misalignment', 'Qiya', 'Collaboration', 'Engagement misalignment tracking', true),

-- Startup & Checklists (2 tables)
('public', 'startup_checklists', 'Qiya', 'Startup', 'Startup checklist items', true),
('public', 'activated_templates', 'Qiya', 'Startup', 'Activated templates', true),

-- Runbooks & Automation (1 table)
('public', 'agrc_runbooks', 'Qiya', 'Automation', 'AGRC runbooks', true),

-- Retired Tables (20 tables - legacy Qiya)
('public', '_retired_lookup_cities', 'Qiya', 'Retired', 'Retired city lookups', false),
('public', '_retired_lookup_countries', 'Qiya', 'Retired', 'Retired country lookups', false),
('public', '_retired_lookup_employee_ranges', 'Qiya', 'Retired', 'Retired employee ranges', false),
('public', '_retired_lookup_frameworks', 'Qiya', 'Retired', 'Retired frameworks', false),
('public', '_retired_lookup_languages', 'Qiya', 'Retired', 'Retired languages', false),
('public', '_retired_lookup_sectors', 'Qiya', 'Retired', 'Retired sectors', false),
('public', '_retired_lookup_timezones', 'Qiya', 'Retired', 'Retired timezones', false),
('public', '_retired_onboarding_compliance_mapping', 'Qiya', 'Retired', 'Retired compliance mapping', false),
('public', '_retired_onboarding_config_audit', 'Qiya', 'Retired', 'Retired config audit', false),
('public', '_retired_onboarding_dynamic_lookups', 'Qiya', 'Retired', 'Retired dynamic lookups', false),
('public', '_retired_onboarding_field_guidance', 'Qiya', 'Retired', 'Retired field guidance', false),
('public', '_retired_onboarding_question_options', 'Qiya', 'Retired', 'Retired question options', false),
('public', '_retired_onboarding_question_types', 'Qiya', 'Retired', 'Retired question types', false),
('public', '_retired_onboarding_questions', 'Qiya', 'Retired', 'Retired questions', false),
('public', '_retired_onboarding_stage_definitions', 'Qiya', 'Retired', 'Retired stage definitions', false),
('public', '_retired_onboarding_tenant_overrides', 'Qiya', 'Retired', 'Retired tenant overrides', false),
('public', '_retired_onboarding_translations', 'Qiya', 'Retired', 'Retired translations', false),
('public', '_retired_onboarding_ui_config', 'Qiya', 'Retired', 'Retired UI config', false),
('public', '_retired_onboarding_user_answers', 'Qiya', 'Retired', 'Retired user answers', false),
('public', '_retired_provisioning_step_definitions', 'Qiya', 'Retired', 'Retired provisioning steps', false)
ON CONFLICT (schema_name, table_name) DO UPDATE SET
    system_category = EXCLUDED.system_category,
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    is_multi_tenant = EXCLUDED.is_multi_tenant,
    updated_at = NOW();

-- Additional lookup tables that support all three systems
INSERT INTO table_system_flags (schema_name, table_name, system_category, module_name, description, is_multi_tenant) VALUES
('public', 'lookup_cities', 'Platform', 'Reference', 'City reference data', false),
('public', 'lookup_countries', 'Platform', 'Reference', 'Country reference data', false),
('public', 'lookup_ksa_cities', 'Platform', 'Reference', 'KSA city reference data', false),
('public', 'lookup_ksa_provinces', 'Platform', 'Reference', 'KSA province reference data', false),
('public', 'lookup_languages', 'Platform', 'Reference', 'Language reference data', false),
('public', 'lookup_timezones', 'Platform', 'Reference', 'Timezone reference data', false),
('public', 'lookup_employee_ranges', 'Platform', 'Reference', 'Employee range categories', false),
('public', 'lookup_sectors', 'Platform', 'Reference', 'General sector categories', false),
('public', 'lookup_connectors', 'Platform', 'Reference', 'Connector types', false),
('public', 'lookup_department_types', 'Platform', 'Reference', 'Department type definitions', false),
('public', 'lookup_org_models', 'Platform', 'Reference', 'Organization models', false),
('public', 'lookup_org_types', 'Platform', 'Reference', 'Organization types', false),
('public', 'lookup_reporting_lines', 'Platform', 'Reference', 'Reporting line types', false),
('public', 'lookup_sector_team_templates', 'Platform', 'Reference', 'Sector team templates', false),
('public', 'lookup_sso_protocols', 'Platform', 'Reference', 'SSO protocol types', false),
('public', 'lookup_sso_providers', 'Platform', 'Reference', 'SSO provider types', false),
('public', 'scan_schedules', 'Platform', 'Reference', 'Scan schedule configurations', false),
('public', 'sectors', 'Platform', 'Reference', 'Sector definitions', false),
('public', 'cadence_overrides', 'Platform', 'Reference', 'Cadence override settings', false)
ON CONFLICT (schema_name, table_name) DO UPDATE SET
    system_category = EXCLUDED.system_category,
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    is_multi_tenant = EXCLUDED.is_multi_tenant,
    updated_at = NOW();

-- ============================================================================
-- SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_table_system_summary AS
SELECT
    system_category,
    COUNT(*) as table_count,
    COUNT(DISTINCT module_name) as module_count,
    SUM(CASE WHEN is_multi_tenant THEN 1 ELSE 0 END) as multi_tenant_tables,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_tables
FROM table_system_flags
GROUP BY system_category
ORDER BY table_count DESC;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    total_count INT;
    categorized_count INT;
    r RECORD;
BEGIN
    -- Count total tables in database
    SELECT COUNT(*) INTO total_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    -- Count categorized tables
    SELECT COUNT(*) INTO categorized_count
    FROM table_system_flags
    WHERE schema_name = 'public';

    RAISE NOTICE 'Total tables in database: %', total_count;
    RAISE NOTICE 'Tables categorized: %', categorized_count;
    RAISE NOTICE 'Missing tables: %', total_count - categorized_count;

    -- Show summary
    RAISE NOTICE '';
    RAISE NOTICE 'System Category Summary:';
    RAISE NOTICE '========================';
    FOR r IN (SELECT * FROM v_table_system_summary) LOOP
        RAISE NOTICE '% Tables: % (% modules, % multi-tenant)',
            r.system_category, r.table_count, r.module_count, r.multi_tenant_tables;
    END LOOP;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get tables by system category
CREATE OR REPLACE FUNCTION get_tables_by_system(p_category VARCHAR)
RETURNS TABLE(
    table_name VARCHAR,
    module_name VARCHAR,
    description TEXT,
    is_multi_tenant BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tsf.table_name,
        tsf.module_name,
        tsf.description,
        tsf.is_multi_tenant
    FROM table_system_flags tsf
    WHERE tsf.system_category = p_category
    AND tsf.is_active = TRUE
    ORDER BY tsf.module_name, tsf.table_name;
END;
$$ LANGUAGE plpgsql;

-- Function to check uncategorized tables
CREATE OR REPLACE FUNCTION find_uncategorized_tables()
RETURNS TABLE(
    schema_name VARCHAR,
    table_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ist.table_schema::VARCHAR as schema_name,
        ist.table_name::VARCHAR
    FROM information_schema.tables ist
    WHERE ist.table_schema = 'public'
    AND ist.table_type = 'BASE TABLE'
    AND NOT EXISTS (
        SELECT 1 FROM table_system_flags tsf
        WHERE tsf.schema_name = ist.table_schema
        AND tsf.table_name = ist.table_name
    )
    ORDER BY ist.table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON table_system_flags TO PUBLIC;
GRANT SELECT ON v_table_system_summary TO PUBLIC;