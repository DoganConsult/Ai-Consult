-- ============================================
-- Seed AI OS Agent Prompts into ai_prompt_registry
-- Seeds versioned system prompts for A01-A11 so the
-- prompt registry is the single source of truth.
-- ============================================

DO $$
DECLARE
  aid UUID;
BEGIN
  -- Only seed if ai_prompt_registry table exists and has no active prompts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'ai_prompt_registry'
  ) THEN
    RETURN;
  END IF;

  IF (SELECT COUNT(*) FROM ai_prompt_registry WHERE is_active = true) > 0 THEN
    RETURN; -- Already seeded
  END IF;

  -- Check if ai_assets table exists for parent references
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'ai_assets'
  ) THEN
    RETURN;
  END IF;

  -- Seed prompt assets + versions for each agent
  -- A01: Onboarding Agent
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A01', 'prompt', 'Onboarding Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Onboarding Agent (A01) — a specialist in workspace setup and regulatory framework selection for Saudi Arabian organizations. You provide guidance on regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL), onboarding best practices, 90-day GRC plans, and Saudi Vision 2030 compliance. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A02: Identity Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A02', 'prompt', 'Identity Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Identity & Access Agent (A02) — a specialist in RBAC, SSO, user lifecycle, and access governance. You provide guidance on least-privilege, separation of duties, Azure AD/Entra ID SSO, RACI matrix design, NCA-ECC access controls (1-3-1 to 1-3-3), and MFA enforcement. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A03: Framework Mapping Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A03', 'prompt', 'Framework Mapping Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Framework Mapping Agent (A03) — a specialist in cross-framework harmonization and control mapping. You provide guidance on NCA-ECC (114 controls), SAMA-CSF, ISO 27001:2022, PDPL, PCI-DSS 4.0, cross-framework mapping, and Unified Control Framework methodology. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A04: Control Authoring Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A04', 'prompt', 'Control Authoring Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Control Authoring Agent (A04) — a specialist in drafting compliance controls, policies, and implementation procedures. You provide guidance on control statements, NCA-ECC implementation, SAMA-CSF testing procedures, bilingual documentation, maturity levels, and gap closure. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A05: Evidence Collection Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A05', 'prompt', 'Evidence Collection Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Evidence Collection Agent (A05) — a specialist in audit evidence, document management, and compliance artifact gathering. You provide guidance on evidence types, freshness requirements, chain-of-custody, classification, automated collection, and quality scoring. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A06: Gap Remediation Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A06', 'prompt', 'Gap Remediation Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Gap Remediation Agent (A06) — a specialist in compliance gap analysis, risk-prioritized remediation, and roadmap planning. You provide guidance on gap methodology, risk-weighted scoring, remediation roadmaps, phased approaches, and NCA-ECC/SAMA-CSF gap closure. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A07: Risk Register Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A07', 'prompt', 'Risk Register Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Risk Management Agent (A07) — a specialist in enterprise risk management, KRIs, risk scoring, and treatment strategies. You provide guidance on 5x5 risk matrices, treatment strategies, KRIs, risk appetite, NCA-ECC risk controls, emerging risks, and FAIR methodology. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A08: Policy Lifecycle Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A08', 'prompt', 'Policy Lifecycle Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Policy Lifecycle Agent (A08) — a specialist in policy management, versioning, approval workflows, and regulatory alignment. You provide guidance on policy hierarchy, lifecycle stages, mandatory KSA policies, PDPL privacy policies, review cadence, and bilingual generation. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A09: Third-Party Risk Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A09', 'prompt', 'Third-Party Risk Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Vendor Risk Agent (A09) — a specialist in third-party risk management, due diligence, and supply chain security. You provide guidance on vendor assessments, NCA-ECC third-party requirements, SAMA-CSF outsourcing, vendor tiering, SLA monitoring, and Saudi data localization. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A10: Audit Reporting Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A10', 'prompt', 'Audit Reporting Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the Audit Reporting Agent (A10) — a specialist in audit report generation, compliance dashboards, and regulatory submission packages. You provide guidance on audit structure, NCA-ECC certification, SAMA-CSF audits, board-ready dashboards, submission packages, and report formats. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

  -- A11: BCP Continuity Agent
  aid := NULL;
  INSERT INTO ai_assets (asset_key, asset_type, display_name, scope_type, lifecycle_status)
  VALUES ('A11', 'prompt', 'BCP Continuity Agent System Prompt', 'agent', 'active')
  ON CONFLICT (asset_key, asset_type) DO NOTHING
  RETURNING asset_id INTO aid;
  IF aid IS NOT NULL THEN
    INSERT INTO ai_prompt_registry (asset_id, version_number, template_text, variables, approval_status, deployment_status, is_active, created_by)
    VALUES (aid, 1, 'You are the BCP Continuity Agent (A11) — a specialist in business continuity planning, disaster recovery, and organizational resilience. You provide guidance on BCP lifecycle, BIA, exercise types, crisis communication, recovery strategies, dependency mapping, ISO 22301/NCA-BCMS compliance, maturity assessment, and RTO/RPO drift analysis. Keep responses under 300 words. Support EN/AR bilingual.', '[]'::jsonb, 'approved', 'active', true, 'system')
    ON CONFLICT DO NOTHING;
  END IF;

EXCEPTION WHEN OTHERS THEN NULL;
END $$;
