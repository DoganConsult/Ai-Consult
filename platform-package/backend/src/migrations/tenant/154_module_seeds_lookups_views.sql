-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 154: Module Seeds, RACI Distribution, Sector Mapping, Views
-- Covers: BCM seed data, Vendor seed data, RACI distribution for 4 modules,
--         sector/dept/profile lookup mapping, cross-module reporting views
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- A. BCM SEED DATA (for 151_bcm_advanced_tables)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema()
               AND table_name = 'bcm_recovery_strategies') THEN
    INSERT INTO bcm_recovery_strategies (title, strategy_type, description, cost_estimate, target_rto_hours, target_rpo_hours, status)
    VALUES
      ('Hot Standby Data Center', 'technology', 'Fully mirrored DC with automatic failover', '{"sar":500000}', 1, 0.5, 'approved'),
      ('Warm Standby DR Site', 'technology', 'Pre-configured DR site with 4-hour data sync', '{"sar":200000}', 4, 4, 'approved'),
      ('Cold Site Recovery', 'facility', 'Basic infrastructure with manual rebuild', '{"sar":50000}', 48, 24, 'draft'),
      ('Cloud-Based DR', 'technology', 'Azure/AWS cloud-based disaster recovery', '{"sar":150000}', 2, 1, 'approved'),
      ('Manual Workaround', 'process', 'Paper-based manual procedures for critical processes', '{"sar":10000}', 8, 8, 'approved')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema()
               AND table_name = 'crisis_comm_plans') THEN
    INSERT INTO crisis_comm_plans (title, description, crisis_type, status)
    VALUES
      ('Executive Crisis Communication', 'C-suite and board notification protocol for major incidents', 'executive', 'active'),
      ('IT Disaster Communication', 'IT team notification for system outages and cyber incidents', 'it_disaster', 'active'),
      ('Regulatory Notification Plan', 'SAMA/NCA regulatory body notification for reportable incidents', 'regulatory', 'draft')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- B. VENDOR SEED DATA (for 152_vendor_advanced_tables)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'vendor_sla_definitions'
               AND column_name = 'measurement_frequency') THEN
    INSERT INTO vendor_sla_definitions (vendor_id, metric_code, metric_name, target_value, warning_threshold, breach_threshold, measurement_frequency, penalty_type)
    SELECT v.vendor_id, 'uptime', 'Service Uptime', 99.9, 99.5, 99.0, 'monthly', 'financial'
    FROM vendors v WHERE NOT EXISTS (SELECT 1 FROM vendor_sla_definitions WHERE vendor_id = v.vendor_id AND metric_code = 'uptime')
    LIMIT 10;

    INSERT INTO vendor_sla_definitions (vendor_id, metric_code, metric_name, target_value, warning_threshold, breach_threshold, measurement_frequency, penalty_type)
    SELECT v.vendor_id, 'response_time', 'Incident Response Time (hrs)', 4, 6, 8, 'per_incident', 'warning'
    FROM vendors v WHERE NOT EXISTS (SELECT 1 FROM vendor_sla_definitions WHERE vendor_id = v.vendor_id AND metric_code = 'response_time')
    LIMIT 10;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- C. RACI DISTRIBUTION TABLES FOR 4 MODULES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS incident_team_distribution (
  dist_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code       VARCHAR(50) NOT NULL,
  raci_role       VARCHAR(20) NOT NULL CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  incident_type   VARCHAR(50) DEFAULT 'all',
  severity_filter VARCHAR(20) DEFAULT 'all',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_code, raci_role, incident_type)
);

INSERT INTO incident_team_distribution (team_code, raci_role, incident_type) VALUES
  ('SEC_OPS', 'responsible', 'all'),
  ('SEC_OPS', 'accountable', 'security'),
  ('IT_OPS',  'responsible', 'it_outage'),
  ('RISK',    'consulted',   'all'),
  ('COMP',    'informed',    'all'),
  ('EXEC',    'informed',    'critical')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS bcp_team_distribution (
  dist_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code     VARCHAR(50) NOT NULL,
  raci_role     VARCHAR(20) NOT NULL CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  plan_type     VARCHAR(50) DEFAULT 'all',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_code, raci_role, plan_type)
);

INSERT INTO bcp_team_distribution (team_code, raci_role, plan_type) VALUES
  ('IT_OPS',  'responsible', 'all'),
  ('RISK',    'accountable', 'all'),
  ('SEC_OPS', 'consulted',   'all'),
  ('EXEC',    'informed',    'all'),
  ('HR',      'consulted',   'pandemic')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS vendor_team_distribution (
  dist_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code     VARCHAR(50) NOT NULL,
  raci_role     VARCHAR(20) NOT NULL CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  vendor_tier   VARCHAR(20) DEFAULT 'all',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_code, raci_role, vendor_tier)
);

INSERT INTO vendor_team_distribution (team_code, raci_role, vendor_tier) VALUES
  ('PROC',   'responsible', 'all'),
  ('RISK',   'accountable', 'critical'),
  ('RISK',   'consulted',   'high'),
  ('LEGAL',  'consulted',   'all'),
  ('COMP',   'informed',    'all'),
  ('SEC_OPS','consulted',   'critical')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS training_team_distribution (
  dist_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code       VARCHAR(50) NOT NULL,
  raci_role       VARCHAR(20) NOT NULL CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  training_type   VARCHAR(50) DEFAULT 'all',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_code, raci_role, training_type)
);

INSERT INTO training_team_distribution (team_code, raci_role, training_type) VALUES
  ('HR',      'responsible', 'all'),
  ('COMP',    'accountable', 'compliance'),
  ('SEC_OPS', 'responsible', 'security_awareness'),
  ('SEC_OPS', 'accountable', 'phishing'),
  ('EXEC',    'informed',    'all'),
  ('RISK',    'consulted',   'all')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- D. SECTOR / DEPARTMENT / PROFILE LOOKUP MAPPING
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS grc_sector_lookup (
  sector_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) NOT NULL UNIQUE,
  name_en       VARCHAR(200) NOT NULL,
  name_ar       VARCHAR(200),
  regulator     VARCHAR(100),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO grc_sector_lookup (code, name_en, name_ar, regulator) VALUES
  ('banking',       'Banking & Finance',          'البنوك والتمويل',         'SAMA'),
  ('insurance',     'Insurance',                  'التأمين',                 'SAMA'),
  ('capital_markets','Capital Markets',            'الأسواق المالية',         'CMA'),
  ('telecom',       'Telecommunications',         'الاتصالات',               'CST'),
  ('healthcare',    'Healthcare',                 'الرعاية الصحية',          'MOH'),
  ('energy',        'Energy & Utilities',         'الطاقة والمرافق',         'ECRA'),
  ('government',    'Government',                 'القطاع الحكومي',          'NCA'),
  ('retail',        'Retail & E-Commerce',        'التجزئة والتجارة الإلكترونية', 'MOCI'),
  ('education',     'Education',                  'التعليم',                 'MOE'),
  ('manufacturing', 'Manufacturing & Industrial', 'التصنيع والصناعة',        'MODON')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS grc_control_sector_mapping (
  mapping_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id    UUID NOT NULL,
  sector_id     UUID NOT NULL REFERENCES grc_sector_lookup(sector_id),
  applicability VARCHAR(20) DEFAULT 'mandatory' CHECK (applicability IN ('mandatory','recommended','optional')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(control_id, sector_id)
);

CREATE TABLE IF NOT EXISTS grc_risk_sector_mapping (
  mapping_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id       UUID NOT NULL,
  sector_id     UUID NOT NULL REFERENCES grc_sector_lookup(sector_id),
  relevance     VARCHAR(20) DEFAULT 'high' CHECK (relevance IN ('high','medium','low')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(risk_id, sector_id)
);

CREATE TABLE IF NOT EXISTS grc_evidence_sector_mapping (
  mapping_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id   UUID NOT NULL,
  sector_id     UUID NOT NULL REFERENCES grc_sector_lookup(sector_id),
  requirement   VARCHAR(20) DEFAULT 'required' CHECK (requirement IN ('required','recommended','optional')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evidence_id, sector_id)
);

CREATE TABLE IF NOT EXISTS grc_entity_profile_mapping (
  mapping_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL CHECK (entity_type IN ('control','risk','evidence','incident','bcp_plan','vendor','training_campaign')),
  entity_id     UUID NOT NULL,
  user_id       UUID,
  team_id       UUID,
  department_id UUID,
  role_code     VARCHAR(50),
  raci_role     VARCHAR(20) CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, user_id, raci_role)
);

CREATE TABLE IF NOT EXISTS grc_evidence_action_mapping (
  mapping_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id   UUID NOT NULL,
  action_type   VARCHAR(50) NOT NULL CHECK (action_type IN ('collect','review','approve','reject','escalate','archive','renew')),
  assigned_to   UUID,
  team_id       UUID,
  role_code     VARCHAR(50),
  deadline_days INT DEFAULT 30,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_control_sector ON grc_control_sector_mapping(control_id);
CREATE INDEX IF NOT EXISTS idx_risk_sector ON grc_risk_sector_mapping(risk_id);
CREATE INDEX IF NOT EXISTS idx_evidence_sector ON grc_evidence_sector_mapping(evidence_id);
CREATE INDEX IF NOT EXISTS idx_entity_profile ON grc_entity_profile_mapping(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_profile_user ON grc_entity_profile_mapping(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_profile_team ON grc_entity_profile_mapping(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_action ON grc_evidence_action_mapping(evidence_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- E. CROSS-MODULE REPORTING VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'incidents' AND column_name = 'updated_at') THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW v_incident_dashboard_summary AS
      SELECT
        COUNT(*)::int AS total_incidents,
        COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
        COUNT(*) FILTER (WHERE status = 'investigating')::int AS investigating_count,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_count,
        COUNT(*) FILTER (WHERE severity IN ('critical','high'))::int AS high_severity_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS last_30_days,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7_days,
        ROUND(AVG(CASE WHEN status IN ('resolved','closed') THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 ELSE NULL END)::numeric, 1) AS avg_resolution_hours
      FROM incidents WHERE deleted_at IS NULL
    $v$;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'bcp_plans')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'bia_assessments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'bcp_exercises') THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW v_bcp_dashboard_summary AS
      SELECT
        COUNT(*)::int AS total_plans,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_count,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
        COUNT(*) FILTER (WHERE status = 'review_required')::int AS review_required_count,
        COUNT(*) FILTER (WHERE last_exercise_at IS NULL OR last_exercise_at < NOW() - INTERVAL '180 days')::int AS untested_count,
        (SELECT COUNT(*)::int FROM bia_assessments WHERE deleted_at IS NULL) AS total_bias,
        (SELECT COUNT(*)::int FROM bcp_exercises WHERE deleted_at IS NULL) AS total_exercises
      FROM bcp_plans WHERE deleted_at IS NULL
    $v$;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'vendors')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'vendor_sla_breach_log') THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW v_vendor_dashboard_summary AS
      SELECT
        COUNT(*)::int AS total_vendors,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
        COUNT(*) FILTER (WHERE risk_tier IN ('critical','high'))::int AS high_risk_count,
        COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending_review_count,
        COUNT(*) FILTER (WHERE dd_status = 'expired')::int AS dd_expired_count,
        COUNT(*) FILTER (WHERE contract_expiry < NOW() + INTERVAL '90 days' AND contract_expiry IS NOT NULL)::int AS contract_expiring_count,
        (SELECT COUNT(*)::int FROM vendor_sla_breach_log WHERE remediation_status IN ('open','investigating')) AS open_sla_breaches
      FROM vendors WHERE deleted_at IS NULL
    $v$;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'training_campaigns')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'training_assignments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'training_certifications')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'training_phishing_campaigns') THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW v_training_dashboard_summary AS
      SELECT
        (SELECT COUNT(*)::int FROM training_campaigns WHERE deleted_at IS NULL) AS total_campaigns,
        (SELECT COUNT(*)::int FROM training_campaigns WHERE status = 'active' AND deleted_at IS NULL) AS active_campaigns,
        (SELECT COUNT(*)::int FROM training_assignments WHERE status = 'completed') AS completed_assignments,
        (SELECT COUNT(*)::int FROM training_assignments WHERE status IN ('assigned','in_progress') AND due_date < NOW()) AS overdue_assignments,
        (SELECT COUNT(*)::int FROM training_certifications WHERE status = 'active' AND expires_at > NOW()) AS active_certifications,
        (SELECT COUNT(*)::int FROM training_certifications WHERE status = 'active' AND expires_at < NOW() + INTERVAL '30 days') AS expiring_certifications,
        (SELECT COUNT(*)::int FROM training_phishing_campaigns WHERE deleted_at IS NULL) AS total_phishing_campaigns,
        (SELECT ROUND(AVG(CASE WHEN status = 'completed' THEN score ELSE NULL END)::numeric, 1) FROM training_assignments) AS avg_score
    $v$;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- F. INCIDENT TAXONOMY SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'incident_taxonomy') THEN
    INSERT INTO incident_taxonomy (code, name_en, name_ar, node_type, severity_hint, regulatory_flag, display_order) VALUES
      ('SEC',       'Security Incident',       'حادث أمني',            'category', 'high',     TRUE,  1),
      ('SEC-MAL',   'Malware / Ransomware',    'برمجيات خبيثة',        'subcategory', 'critical', TRUE,  1),
      ('SEC-PHISH', 'Phishing Attack',         'هجوم تصيد',            'subcategory', 'high',     TRUE,  2),
      ('SEC-UNAUTH','Unauthorized Access',     'وصول غير مصرح',        'subcategory', 'critical', TRUE,  3),
      ('SEC-DLP',   'Data Leakage',            'تسريب بيانات',         'subcategory', 'critical', TRUE,  4),
      ('OPS',       'Operational Incident',    'حادث تشغيلي',          'category', 'medium',   FALSE, 2),
      ('OPS-OUT',   'System Outage',           'انقطاع النظام',        'subcategory', 'high',     FALSE, 1),
      ('OPS-PERF',  'Performance Degradation', 'تدهور الأداء',         'subcategory', 'medium',   FALSE, 2),
      ('OPS-CFG',   'Configuration Error',     'خطأ في التهيئة',       'subcategory', 'medium',   FALSE, 3),
      ('COMP',      'Compliance Incident',     'حادث امتثال',          'category', 'high',     TRUE,  3),
      ('COMP-REG',  'Regulatory Breach',       'مخالفة تنظيمية',       'subcategory', 'critical', TRUE,  1),
      ('COMP-POL',  'Policy Violation',        'مخالفة سياسة',         'subcategory', 'high',     TRUE,  2),
      ('PHYS',      'Physical Incident',       'حادث مادي',            'category', 'medium',   FALSE, 4),
      ('PHYS-ACC',  'Physical Access Breach',  'خرق الوصول المادي',    'subcategory', 'high',     FALSE, 1),
      ('PHYS-ENV',  'Environmental Incident',  'حادث بيئي',            'subcategory', 'medium',   FALSE, 2)
    ON CONFLICT DO NOTHING;

    UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'SEC' LIMIT 1)
    WHERE code IN ('SEC-MAL','SEC-PHISH','SEC-UNAUTH','SEC-DLP') AND parent_id IS NULL;

    UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'OPS' LIMIT 1)
    WHERE code IN ('OPS-OUT','OPS-PERF','OPS-CFG') AND parent_id IS NULL;

    UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'COMP' LIMIT 1)
    WHERE code IN ('COMP-REG','COMP-POL') AND parent_id IS NULL;

    UPDATE incident_taxonomy SET parent_id = (SELECT node_id FROM incident_taxonomy WHERE code = 'PHYS' LIMIT 1)
    WHERE code IN ('PHYS-ACC','PHYS-ENV') AND parent_id IS NULL;
  END IF;
END $$;


COMMENT ON TABLE incident_team_distribution IS 'RACI distribution rules for auto-assigning teams to incidents by type/severity';
COMMENT ON TABLE bcp_team_distribution IS 'RACI distribution rules for auto-assigning teams to BCP plans by type';
COMMENT ON TABLE vendor_team_distribution IS 'RACI distribution rules for auto-assigning teams to vendors by risk tier';
COMMENT ON TABLE training_team_distribution IS 'RACI distribution rules for auto-assigning teams to training by type';
COMMENT ON TABLE grc_sector_lookup IS 'KSA sector reference data with regulator mappings for controls/risks/evidence';
COMMENT ON TABLE grc_control_sector_mapping IS 'Maps controls to sectors with mandatory/recommended/optional applicability';
COMMENT ON TABLE grc_risk_sector_mapping IS 'Maps risks to sectors with relevance levels';
COMMENT ON TABLE grc_evidence_sector_mapping IS 'Maps evidence requirements to sectors';
COMMENT ON TABLE grc_entity_profile_mapping IS 'Maps GRC entities to user profiles, teams, departments with RACI roles';
COMMENT ON TABLE grc_evidence_action_mapping IS 'Defines required actions per evidence with assignments and deadlines';
