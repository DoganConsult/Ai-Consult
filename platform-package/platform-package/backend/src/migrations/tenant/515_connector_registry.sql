-- ============================================
-- Shahin GRC — Tenant Migration 296
-- Dynamic Connector Registry
-- DB-driven capability catalog, dependency
-- graph, and automation rules for connectors.
-- ============================================

-- ── Connector Registry ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connector_registry (
  connector_code    VARCHAR(50)  PRIMARY KEY,
  display_name_en   VARCHAR(200) NOT NULL,
  display_name_ar   VARCHAR(200),
  connector_category VARCHAR(30) NOT NULL
    CHECK (connector_category IN ('siem','iam','itsm','cmdb','vulnerability','cloud','erp','collaboration')),
  direction         VARCHAR(20)  NOT NULL DEFAULT 'read'
    CHECK (direction IN ('read','write','bidirectional')),
  supported_objects TEXT[]       DEFAULT '{}',
  data_table        VARCHAR(100),
  produces_grc_objects TEXT[]    DEFAULT '{}',
  default_schedule  VARCHAR(50)  DEFAULT '0 2 * * *',
  default_refresh_interval VARCHAR(50) DEFAULT 'daily',
  auth_methods      TEXT[]       DEFAULT '{api_key}',
  platforms         JSONB        DEFAULT '[]',
  icon              VARCHAR(50),
  icon_color        VARCHAR(20),
  setup_time        VARCHAR(20)  DEFAULT '10 min',
  tags              TEXT[]       DEFAULT '{}',
  documentation_url VARCHAR(500),
  is_active         BOOLEAN      DEFAULT TRUE,
  licensed          BOOLEAN      DEFAULT TRUE,
  sort_order        INT          DEFAULT 100,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_registry_category
  ON connector_registry (connector_category, is_active);

-- ── Connector Dependency Graph ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connector_dependency_graph (
  id                SERIAL PRIMARY KEY,
  source_connector  VARCHAR(50)  NOT NULL REFERENCES connector_registry(connector_code),
  target_module     VARCHAR(50)  NOT NULL,
  dependency_type   VARCHAR(30)  NOT NULL
    CHECK (dependency_type IN ('feeds_into','triggers','validates','requires','enriches')),
  via_event         VARCHAR(100),
  via_processor     VARCHAR(100),
  description_en    VARCHAR(300),
  is_active         BOOLEAN      DEFAULT TRUE,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_dep_source
  ON connector_dependency_graph (source_connector, is_active);

-- ── Connector Automation Rules ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connector_automation_rules (
  rule_id           SERIAL PRIMARY KEY,
  connector_code    VARCHAR(50)  NOT NULL REFERENCES connector_registry(connector_code),
  rule_code         VARCHAR(50)  NOT NULL,
  rule_name_en      VARCHAR(200) NOT NULL,
  trigger_event     VARCHAR(100) NOT NULL,
  action_type       VARCHAR(50)  NOT NULL
    CHECK (action_type IN ('create_incident','create_risk','create_task','submit_evidence','escalate','notify','link_entity')),
  conditions        JSONB        DEFAULT '{}',
  action_config     JSONB        DEFAULT '{}',
  enabled           BOOLEAN      DEFAULT TRUE,
  sort_order        INT          DEFAULT 10,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (connector_code, rule_code)
);

-- ── Seed: Default Connector Registry ──────────────────────────────────────

INSERT INTO connector_registry (connector_code, display_name_en, display_name_ar, connector_category, direction,
  supported_objects, data_table, produces_grc_objects, default_schedule, default_refresh_interval,
  auth_methods, platforms, icon, icon_color, setup_time, tags, sort_order)
VALUES
  ('siem', 'SIEM / EDR', 'نظام إدارة الأحداث الأمنية', 'siem', 'read',
   '{security_events,alerts,incidents}', 'siem_events', '{incidents,risks,evidence}',
   '*/15 * * * *', '15 minutes', '{oauth2,api_key,basic}',
   '[{"value":"splunk","label":"Splunk","authMethod":"basic","fields":[{"key":"baseUrl","label":"Splunk Base URL","required":true,"type":"url","placeholder":"https://splunk.company.com:8089"},{"key":"username","label":"Username","required":true},{"key":"password","label":"Password","required":true,"type":"password"}]},{"value":"sentinel","label":"Azure Sentinel","authMethod":"oauth2","fields":[{"key":"tenantId","label":"Azure Tenant ID","required":true},{"key":"clientId","label":"Client ID","required":true},{"key":"clientSecret","label":"Client Secret","required":true,"type":"password"},{"key":"subscriptionId","label":"Subscription ID","required":true},{"key":"resourceGroup","label":"Resource Group","required":true},{"key":"workspaceName","label":"Workspace Name","required":true}]},{"value":"generic","label":"Generic SIEM API","authMethod":"api_key","fields":[{"key":"baseUrl","label":"API Base URL","required":true,"type":"url"},{"key":"apiKey","label":"API Key","required":true,"type":"password"}]}]'::jsonb,
   'pi-shield', '#dc2626', '5 min', '{security,monitoring,alerts}', 10),

  ('iam', 'IAM / Identity', 'إدارة الهوية والوصول', 'iam', 'read',
   '{identities,groups,roles,sign_in_logs,access_reviews}', 'iam_identities', '{access_review_tasks,orphan_detection_tasks,evidence}',
   '0 */4 * * *', '4 hours', '{oauth2,api_key,scim_bearer}',
   '[{"value":"azure_ad","label":"Azure AD / Entra ID","authMethod":"oauth2","fields":[{"key":"tenantId","label":"Azure Tenant ID","required":true},{"key":"clientId","label":"Client ID","required":true},{"key":"clientSecret","label":"Client Secret","required":true,"type":"password"}]},{"value":"okta","label":"Okta","authMethod":"api_key","fields":[{"key":"domain","label":"Okta Domain","required":true,"placeholder":"company.okta.com"},{"key":"apiToken","label":"API Token","required":true,"type":"password"}]},{"value":"generic","label":"Generic IAM API","authMethod":"api_key","fields":[{"key":"baseUrl","label":"API Base URL","required":true,"type":"url"},{"key":"apiKey","label":"API Key","required":true,"type":"password"}]}]'::jsonb,
   'pi-users', '#7c3aed', '10 min', '{identity,sso,access}', 20),

  ('itsm', 'ITSM / Ticketing', 'إدارة خدمات تقنية المعلومات', 'itsm', 'bidirectional',
   '{incidents,change_requests,problems,service_requests}', 'itsm_tickets', '{incident_links,remediation_task_sync,evidence}',
   '*/30 * * * *', '30 minutes', '{oauth2,api_key,basic}',
   '[{"value":"servicenow","label":"ServiceNow","authMethod":"oauth2","fields":[{"key":"instance","label":"Instance","required":true,"placeholder":"company.service-now.com"},{"key":"clientId","label":"Client ID","required":true},{"key":"clientSecret","label":"Client Secret","required":true,"type":"password"}]},{"value":"jira","label":"Jira Service Management","authMethod":"basic","fields":[{"key":"baseUrl","label":"Jira Base URL","required":true,"type":"url","placeholder":"https://company.atlassian.net"},{"key":"email","label":"Email","required":true},{"key":"apiToken","label":"API Token","required":true,"type":"password"}]},{"value":"generic","label":"Generic ITSM API","authMethod":"api_key","fields":[{"key":"baseUrl","label":"API Base URL","required":true,"type":"url"},{"key":"apiKey","label":"API Key","required":true,"type":"password"}]}]'::jsonb,
   'pi-ticket', '#0284c7', '10 min', '{ticketing,change,incident}', 30),

  ('cmdb', 'CMDB / Assets', 'قاعدة بيانات إدارة التهيئة', 'cmdb', 'read',
   '{configuration_items,asset_relationships,asset_classes}', 'cmdb_assets', '{uncontrolled_asset_tasks,evidence}',
   '0 3 * * *', 'daily', '{oauth2,api_key,basic}',
   '[{"value":"servicenow","label":"ServiceNow CMDB","authMethod":"basic","fields":[{"key":"instance","label":"Instance","required":true,"placeholder":"company.service-now.com"},{"key":"username","label":"Username","required":true},{"key":"password","label":"Password","required":true,"type":"password"}]},{"value":"generic","label":"Generic CMDB API","authMethod":"api_key","fields":[{"key":"baseUrl","label":"API Base URL","required":true,"type":"url"},{"key":"apiKey","label":"API Key","required":true,"type":"password"}]}]'::jsonb,
   'pi-server', '#059669', '10 min', '{assets,inventory,cmdb}', 40),

  ('vuln', 'Vulnerability Scanner', 'ماسح الثغرات الأمنية', 'vulnerability', 'read',
   '{scan_results,vulnerabilities,patch_status}', 'vuln_scan_results', '{risks,remediation_tasks,evidence}',
   '0 4 * * *', 'daily', '{oauth2,api_key,basic}',
   '[{"value":"qualys","label":"Qualys","authMethod":"basic","fields":[{"key":"baseUrl","label":"Qualys API URL","type":"url","placeholder":"https://qualysapi.qualys.com"},{"key":"username","label":"Username","required":true},{"key":"password","label":"Password","required":true,"type":"password"}]},{"value":"tenable","label":"Tenable / Nessus","authMethod":"api_key","fields":[{"key":"baseUrl","label":"Tenable URL","type":"url","placeholder":"https://cloud.tenable.com"},{"key":"accessKey","label":"Access Key","required":true,"type":"password"},{"key":"secretKey","label":"Secret Key","required":true,"type":"password"}]},{"value":"generic","label":"Generic Vuln API","authMethod":"api_key","fields":[{"key":"baseUrl","label":"API Base URL","required":true,"type":"url"},{"key":"apiKey","label":"API Key","required":true,"type":"password"}]}]'::jsonb,
   'pi-exclamation-triangle', '#ea580c', '5 min', '{vulnerability,scanning,cvss}', 50),

  ('m365', 'Microsoft 365', 'مايكروسوفت 365', 'cloud', 'read',
   '{emails,sharepoint_files,onedrive_files,teams_messages,compliance_reports}', 'm365_evidence_items', '{evidence}',
   '0 2 * * *', 'daily', '{oauth2}',
   '[{"value":"azure_ad","label":"Microsoft 365 (Graph API)","authMethod":"oauth2","fields":[{"key":"tenantId","label":"Azure Tenant ID","required":true},{"key":"clientId","label":"Client ID (App Registration)","required":true},{"key":"clientSecret","label":"Client Secret","required":true,"type":"password"}]},{"value":"teams","label":"Microsoft Teams","authMethod":"oauth2","fields":[{"key":"tenantId","label":"Azure Tenant ID","required":true},{"key":"clientId","label":"Client ID","required":true},{"key":"clientSecret","label":"Client Secret","required":true,"type":"password"}]},{"value":"power_bi","label":"Power BI","authMethod":"oauth2","fields":[{"key":"tenantId","label":"Azure Tenant ID","required":true},{"key":"clientId","label":"Client ID","required":true},{"key":"clientSecret","label":"Client Secret","required":true,"type":"password"},{"key":"workspaceId","label":"Workspace ID","required":true}]},{"value":"dynamics365","label":"Dynamics 365","authMethod":"oauth2","fields":[{"key":"tenantId","label":"Azure Tenant ID","required":true},{"key":"clientId","label":"Client ID","required":true},{"key":"clientSecret","label":"Client Secret","required":true,"type":"password"},{"key":"environmentUrl","label":"Environment URL","required":true,"type":"url","placeholder":"https://org.crm.dynamics.com"}]}]'::jsonb,
   'pi-microsoft', '#2563eb', '10 min', '{evidence,documents,email,collaboration}', 60),

  ('erp', 'ERP / Financial', 'تخطيط موارد المؤسسة', 'erp', 'read',
   '{journal_entries,financial_documents,sod_analysis,audit_logs}', 'erp_records', '{evidence,financial_risks}',
   '0 1 * * *', 'daily', '{oauth2,basic}',
   '[{"value":"sap","label":"SAP S/4HANA","authMethod":"oauth2","fields":[{"key":"baseUrl","label":"SAP Base URL","required":true,"type":"url"},{"key":"tokenUrl","label":"OAuth Token URL","type":"url"},{"key":"clientId","label":"Client ID","required":true},{"key":"clientSecret","label":"Client Secret","required":true,"type":"password"}]},{"value":"oracle","label":"Oracle ERP Cloud","authMethod":"basic","fields":[{"key":"baseUrl","label":"Oracle Base URL","required":true,"type":"url"},{"key":"username","label":"Username","required":true},{"key":"password","label":"Password","required":true,"type":"password"}]},{"value":"generic","label":"Generic ERP API","authMethod":"api_key","fields":[{"key":"baseUrl","label":"API Base URL","required":true,"type":"url"},{"key":"apiKey","label":"API Key","required":true,"type":"password"}]}]'::jsonb,
   'pi-chart-bar', '#b45309', '15 min', '{financial,audit,sod}', 70)
ON CONFLICT (connector_code) DO NOTHING;

-- ── Seed: Dependency Graph ────────────────────────────────────────────────

INSERT INTO connector_dependency_graph (source_connector, target_module, dependency_type, via_event, via_processor, description_en)
VALUES
  ('siem', 'incident',     'feeds_into', 'connector.sync_completed', 'processSiemEvents',   'High/critical SIEM events create security incidents'),
  ('siem', 'risk',         'feeds_into', 'connector.sync_completed', 'processSiemEvents',   'Medium SIEM events create cyber security risks'),
  ('siem', 'evidence',     'feeds_into', 'connector.sync_completed', 'processSiemEvents',   'All SIEM events with control mappings become evidence'),
  ('vuln', 'risk',         'feeds_into', 'connector.sync_completed', 'processVulnResults',  'High CVSS vulnerabilities create risks'),
  ('vuln', 'remediation',  'triggers',   'connector.sync_completed', 'processVulnResults',  'Critical/high vulns create remediation tasks'),
  ('vuln', 'evidence',     'feeds_into', 'connector.sync_completed', 'processVulnResults',  'Scan results become vulnerability evidence'),
  ('iam',  'access_review','triggers',   'connector.sync_completed', 'processIamIdentities','Privileged accounts trigger access reviews'),
  ('iam',  'risk',         'feeds_into', 'connector.sync_completed', 'processIamIdentities','Orphan accounts create risk assessment tasks'),
  ('iam',  'evidence',     'feeds_into', 'connector.sync_completed', 'processIamIdentities','Identity sync summaries become evidence'),
  ('itsm', 'incident',     'enriches',   'connector.sync_completed', 'processItsmTickets',  'ITSM tickets link to existing incidents'),
  ('itsm', 'remediation',  'validates',  'connector.sync_completed', 'processItsmTickets',  'Closed ITSM tickets auto-complete remediation tasks'),
  ('itsm', 'evidence',     'feeds_into', 'connector.sync_completed', 'processItsmTickets',  'Change/security tickets become evidence'),
  ('cmdb', 'control',      'triggers',   'connector.sync_completed', 'processCmdbAssets',   'Uncontrolled critical assets trigger control reviews'),
  ('cmdb', 'evidence',     'feeds_into', 'connector.sync_completed', 'processCmdbAssets',   'Asset inventory syncs become evidence'),
  ('m365', 'evidence',     'feeds_into', 'connector.sync_completed', 'processM365Items',    'Staged M365 items auto-link as evidence'),
  ('erp',  'evidence',     'feeds_into', 'connector.sync_completed', 'processErpRecords',   'Financial documents become audit evidence')
ON CONFLICT DO NOTHING;

-- ── Seed: Default Automation Rules ────────────────────────────────────────

INSERT INTO connector_automation_rules (connector_code, rule_code, rule_name_en, trigger_event, action_type, conditions, action_config, enabled, sort_order)
VALUES
  ('siem', 'siem_critical_incident', 'Create incident on critical SIEM event', 'connector.sync_completed',
   'create_incident', '{"severity":["critical","high"]}', '{"category":"security","auto_escalate":true}', TRUE, 10),
  ('siem', 'siem_medium_risk', 'Create risk on medium SIEM event', 'connector.sync_completed',
   'create_risk', '{"severity":["medium"]}', '{"category":"cyber_security","likelihood":3,"impact":3}', TRUE, 20),
  ('vuln', 'vuln_high_risk', 'Create risk on high CVSS finding', 'connector.sync_completed',
   'create_risk', '{"cvss_min":7.0}', '{"category":"vulnerability"}', TRUE, 10),
  ('vuln', 'vuln_remediation', 'Create remediation task for critical vulns', 'connector.sync_completed',
   'create_task', '{"severity":["critical","high"]}', '{"task_type":"remediation","sla_critical":24,"sla_high":72}', TRUE, 20),
  ('iam', 'iam_orphan_detect', 'Flag orphan accounts', 'connector.sync_completed',
   'create_task', '{"check":"orphan_accounts"}', '{"task_type":"risk_assessment","sla_hours":168}', TRUE, 10),
  ('iam', 'iam_access_review', 'Trigger access review for privileged accounts', 'connector.sync_completed',
   'create_task', '{"check":"privileged_no_review","review_window_days":90}', '{"task_type":"control_review","sla_hours":72}', TRUE, 20),
  ('itsm', 'itsm_auto_complete', 'Auto-complete tasks on ITSM ticket closure', 'connector.sync_completed',
   'link_entity', '{"ticket_status":["resolved","closed"]}', '{"complete_linked_tasks":true}', TRUE, 10),
  ('cmdb', 'cmdb_uncontrolled', 'Flag uncontrolled critical assets', 'connector.sync_completed',
   'create_task', '{"criticality":["critical","high"],"require_linked_controls":false}', '{"task_type":"control_review","sla_hours":168}', TRUE, 10)
ON CONFLICT (connector_code, rule_code) DO NOTHING;
