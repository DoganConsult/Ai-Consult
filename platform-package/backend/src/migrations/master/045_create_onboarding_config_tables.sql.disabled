-- =====================================================
-- DEPRECATED — Legacy onboarding configuration tables
-- =====================================================
-- Superseded by master/003_onboarding_v2_tables.sql
-- Kept for reference; do NOT run on new environments.
-- =====================================================
--
-- ORIGINAL DESCRIPTION:
-- This migration creates all required tables to move
-- hardcoded onboarding values to the database
-- =====================================================

-- 1. STAGE DEFINITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_stage_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_code VARCHAR(100) UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL,
  icon_class VARCHAR(100),
  label_en VARCHAR(255) NOT NULL,
  label_ar VARCHAR(255) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  min_readiness_score NUMERIC(5,2) DEFAULT 0,
  max_completion_days INTEGER DEFAULT 30,
  validation_rules JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Create indexes for stage definitions
CREATE INDEX idx_stage_definitions_code ON onboarding_stage_definitions(stage_code);
CREATE INDEX idx_stage_definitions_active ON onboarding_stage_definitions(is_active) WHERE is_active = true;
CREATE INDEX idx_stage_definitions_sort ON onboarding_stage_definitions(sort_order);

-- Add comments
COMMENT ON TABLE onboarding_stage_definitions IS 'Master table for onboarding stage configurations';
COMMENT ON COLUMN onboarding_stage_definitions.stage_code IS 'Unique identifier code for the stage';
COMMENT ON COLUMN onboarding_stage_definitions.validation_rules IS 'JSON rules for stage validation';

-- 2. PROVISIONING STEP DEFINITIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS provisioning_step_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_code VARCHAR(100) UNIQUE NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  step_name_ar VARCHAR(255),
  sequence_no INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  can_retry BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 300,
  handler_class VARCHAR(255),
  depends_on VARCHAR(100)[],
  configuration JSONB DEFAULT '{}',
  error_handling JSONB DEFAULT '{"action": "fail", "notification": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Create indexes for provisioning steps
CREATE INDEX idx_prov_step_defs_code ON provisioning_step_definitions(step_code);
CREATE INDEX idx_prov_step_defs_active ON provisioning_step_definitions(is_active) WHERE is_active = true;
CREATE INDEX idx_prov_step_defs_seq ON provisioning_step_definitions(sequence_no);

-- Add comments
COMMENT ON TABLE provisioning_step_definitions IS 'Master table for provisioning step configurations';
COMMENT ON COLUMN provisioning_step_definitions.depends_on IS 'Array of step codes this step depends on';
COMMENT ON COLUMN provisioning_step_definitions.handler_class IS 'Class name that handles this provisioning step';

-- 3. UI CONFIGURATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_ui_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  value_type VARCHAR(50) NOT NULL CHECK (value_type IN ('number', 'boolean', 'string', 'json', 'array')),
  category VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_editable BOOLEAN DEFAULT true,
  min_value NUMERIC,
  max_value NUMERIC,
  allowed_values TEXT[],
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Create indexes for UI config
CREATE INDEX idx_ui_config_key ON onboarding_ui_config(config_key);
CREATE INDEX idx_ui_config_category ON onboarding_ui_config(category);
CREATE INDEX idx_ui_config_active ON onboarding_ui_config(is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE onboarding_ui_config IS 'UI configuration values for onboarding process';
COMMENT ON COLUMN onboarding_ui_config.value_type IS 'Data type of the configuration value';
COMMENT ON COLUMN onboarding_ui_config.allowed_values IS 'Array of allowed values for validation';

-- 4. TRANSLATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key VARCHAR(255) UNIQUE NOT NULL,
  text_en TEXT NOT NULL,
  text_ar TEXT NOT NULL,
  text_fr TEXT,
  text_es TEXT,
  text_de TEXT,
  text_zh TEXT,
  text_ja TEXT,
  text_ru TEXT,
  context VARCHAR(100) CHECK (context IN ('ui', 'message', 'error', 'tooltip', 'placeholder', 'validation', 'help')),
  module VARCHAR(100) DEFAULT 'onboarding',
  is_active BOOLEAN DEFAULT true,
  is_html BOOLEAN DEFAULT false,
  variables VARCHAR(100)[],
  max_length INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Create indexes for translations
CREATE INDEX idx_translations_key ON onboarding_translations(translation_key);
CREATE INDEX idx_translations_context ON onboarding_translations(context);
CREATE INDEX idx_translations_module ON onboarding_translations(module);
CREATE INDEX idx_translations_active ON onboarding_translations(is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE onboarding_translations IS 'Multi-language translations for onboarding UI';
COMMENT ON COLUMN onboarding_translations.variables IS 'Array of variable names used in translation (e.g., {name}, {count})';
COMMENT ON COLUMN onboarding_translations.is_html IS 'Whether the translation contains HTML markup';

-- 5. TENANT-SPECIFIC OVERRIDES TABLE (Bonus for multi-tenancy)
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_tenant_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  override_type VARCHAR(50) NOT NULL CHECK (override_type IN ('stage', 'step', 'config', 'translation')),
  override_key VARCHAR(255) NOT NULL,
  override_value JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  UNIQUE(tenant_id, override_type, override_key)
);

-- Create indexes for tenant overrides
CREATE INDEX idx_tenant_overrides_tenant ON onboarding_tenant_overrides(tenant_id);
CREATE INDEX idx_tenant_overrides_type ON onboarding_tenant_overrides(override_type);
CREATE INDEX idx_tenant_overrides_key ON onboarding_tenant_overrides(override_key);
CREATE INDEX idx_tenant_overrides_active ON onboarding_tenant_overrides(is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE onboarding_tenant_overrides IS 'Tenant-specific overrides for onboarding configuration';

-- 6. AUDIT LOG TABLE FOR CONFIGURATION CHANGES
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for audit log
CREATE INDEX idx_config_audit_table ON onboarding_config_audit(table_name);
CREATE INDEX idx_config_audit_record ON onboarding_config_audit(record_id);
CREATE INDEX idx_config_audit_action ON onboarding_config_audit(action);
CREATE INDEX idx_config_audit_changed_at ON onboarding_config_audit(changed_at);

-- =====================================================
-- SEED DATA - STAGE DEFINITIONS
-- =====================================================
INSERT INTO onboarding_stage_definitions (
  stage_code, sort_order, icon_class, label_en, label_ar,
  description_en, description_ar, is_required, min_readiness_score
) VALUES
  ('organization_identity', 1, 'pi-building', 'Organization', 'الجهة',
   'Legal identity & tenant setup', 'الهوية القانونية وإعداد الجهة', true, 10),

  ('regulatory_scope', 2, 'pi-shield', 'Regulatory Scope', 'النطاق التنظيمي',
   'Jurisdictions & frameworks', 'الاختصاصات والأطر', true, 10),

  ('org_structure', 3, 'pi-sitemap', 'Structure', 'الهيكل',
   'Departments & entities', 'الإدارات والكيانات', true, 10),

  ('technology_landscape', 4, 'pi-server', 'Technology', 'التقنية',
   'Systems & integrations', 'الأنظمة والتكاملات', false, 5),

  ('governance_model', 5, 'pi-briefcase', 'Governance', 'الحوكمة',
   'Committees & approvals', 'اللجان والموافقات', true, 10),

  ('risk_compliance_maturity', 6, 'pi-chart-bar', 'Maturity', 'النضج',
   'Risk & compliance readiness', 'جاهزية المخاطر والامتثال', true, 15),

  ('operating_model', 7, 'pi-cog', 'Operating Model', 'نموذج التشغيل',
   'Workflows & SLAs', 'سير العمل واتفاقيات الخدمة', false, 10),

  ('people_ownership', 8, 'pi-users', 'People', 'الأشخاص',
   'Ownership & invitations', 'المسؤوليات والدعوات', true, 10),

  ('review_confirmation', 9, 'pi-check-circle', 'Review', 'المراجعة',
   'Confirm before provisioning', 'التأكيد قبل التهيئة', true, 0),

  ('provision_workspace', 10, 'pi-play', 'Provision', 'التهيئة',
   'Create & seed workspace', 'إنشاء وتهيئة مساحة العمل', true, 0);

-- =====================================================
-- SEED DATA - PROVISIONING STEP DEFINITIONS
-- =====================================================
INSERT INTO provisioning_step_definitions (
  step_code, step_name, step_name_ar, sequence_no,
  is_required, can_retry, max_retries, timeout_seconds
) VALUES
  ('create_tenant_master', 'Create tenant master', 'إنشاء السجل الرئيسي للمستأجر', 1, true, true, 3, 60),
  ('create_workspace', 'Create workspace', 'إنشاء مساحة العمل', 2, true, true, 3, 60),
  ('allocate_tenant_schema', 'Allocate tenant schema', 'تخصيص مخطط المستأجر', 3, true, true, 3, 120),
  ('run_tenant_migrations', 'Run tenant migrations', 'تشغيل ترحيلات المستأجر', 4, true, true, 3, 300),
  ('seed_tenant_preferences', 'Seed tenant preferences', 'تهيئة تفضيلات المستأجر', 5, true, true, 3, 60),
  ('seed_org_structure', 'Seed organization structure', 'تهيئة الهيكل التنظيمي', 6, true, true, 3, 120),
  ('seed_frameworks', 'Seed frameworks', 'تهيئة الأطر', 7, true, true, 3, 180),
  ('seed_controls', 'Seed controls', 'تهيئة الضوابط', 8, true, true, 3, 240),
  ('seed_risks', 'Seed risks', 'تهيئة المخاطر', 9, false, true, 3, 180),
  ('seed_policies', 'Seed policies', 'تهيئة السياسات', 10, false, true, 3, 120),
  ('seed_evidence_plan', 'Seed evidence plan', 'تهيئة خطة الأدلة', 11, false, true, 3, 120),
  ('seed_workflows', 'Seed workflows', 'تهيئة سير العمل', 12, true, true, 3, 180),
  ('seed_dashboard_profile', 'Seed dashboard profile', 'تهيئة ملف لوحة المعلومات', 13, true, true, 3, 60),
  ('create_default_roles', 'Create default roles', 'إنشاء الأدوار الافتراضية', 14, true, true, 3, 60),
  ('create_user_invitations', 'Create user invitations', 'إنشاء دعوات المستخدمين', 15, false, true, 3, 120),
  ('run_post_seed_validations', 'Run post-seed validations', 'تشغيل التحققات بعد التهيئة', 16, true, true, 3, 180),
  ('activate_workspace', 'Activate workspace', 'تفعيل مساحة العمل', 17, true, false, 1, 60),
  ('generate_startup_checklist', 'Generate startup checklist', 'إنشاء قائمة التحقق الأولية', 18, false, true, 3, 120),
  ('handover_complete', 'Handover complete', 'اكتمال التسليم', 19, true, false, 1, 30);

-- =====================================================
-- SEED DATA - UI CONFIGURATION
-- =====================================================
INSERT INTO onboarding_ui_config (
  config_key, config_value, value_type, category, description, min_value, max_value
) VALUES
  -- Thresholds
  ('readiness_threshold_ready', '80', 'number', 'thresholds',
   'Minimum readiness score to be considered ready', 0, 100),
  ('readiness_threshold_warning', '40', 'number', 'thresholds',
   'Minimum readiness score for warning state', 0, 100),

  -- Behavior
  ('autosave_delay_ms', '2000', 'number', 'behavior',
   'Delay in milliseconds before auto-saving', 500, 10000),
  ('polling_interval_ms', '2000', 'number', 'behavior',
   'Polling interval for provisioning status', 1000, 5000),
  ('session_timeout_minutes', '30', 'number', 'security',
   'Session timeout in minutes', 5, 120),

  -- UI Settings
  ('multiselect_filter_threshold', '8', 'number', 'ui',
   'Number of options before showing filter in dropdown', 5, 20),
  ('progress_bar_height', '8px', 'string', 'ui',
   'Height of progress bar', NULL, NULL),
  ('progress_bar_border_radius', '4px', 'string', 'ui',
   'Border radius of progress bar', NULL, NULL),
  ('max_file_upload_size_mb', '10', 'number', 'limits',
   'Maximum file upload size in MB', 1, 100),

  -- Feature Flags
  ('enable_autosave', 'true', 'boolean', 'features',
   'Enable automatic saving of answers', NULL, NULL),
  ('enable_stage_validation', 'true', 'boolean', 'features',
   'Enable stage validation before proceeding', NULL, NULL),
  ('enable_live_intelligence', 'true', 'boolean', 'features',
   'Enable live intelligence panel', NULL, NULL),
  ('enable_multi_language', 'true', 'boolean', 'features',
   'Enable multi-language support', NULL, NULL),
  ('enable_stage_skip', 'false', 'boolean', 'features',
   'Allow skipping non-required stages', NULL, NULL),

  -- Provisioning Settings
  ('provisioning_max_duration_minutes', '10', 'number', 'provisioning',
   'Maximum duration for provisioning job', 1, 60),
  ('provisioning_retry_enabled', 'true', 'boolean', 'provisioning',
   'Enable retry for failed provisioning', NULL, NULL),
  ('provisioning_parallel_steps', 'false', 'boolean', 'provisioning',
   'Enable parallel execution of provisioning steps', NULL, NULL);

-- =====================================================
-- SEED DATA - TRANSLATIONS
-- =====================================================
INSERT INTO onboarding_translations (
  translation_key, text_en, text_ar, context, variables
) VALUES
  -- Top Bar
  ('onboarding.title', 'AGRC-OS Onboarding', 'نظام التهيئة', 'ui', NULL),
  ('onboarding.progress', 'Progress', 'التقدم', 'ui', NULL),
  ('onboarding.readiness', 'Readiness', 'الجاهزية', 'ui', NULL),
  ('onboarding.saving', 'Saving...', 'حفظ...', 'message', NULL),
  ('onboarding.saved', 'Saved', 'تم الحفظ', 'message', NULL),
  ('onboarding.exit', 'Exit', 'خروج', 'tooltip', NULL),
  ('onboarding.language.english', 'English', 'الإنجليزية', 'tooltip', NULL),
  ('onboarding.language.arabic', 'العربية', 'Arabic', 'tooltip', NULL),

  -- Navigation
  ('onboarding.button.previous', 'Previous', 'السابق', 'ui', NULL),
  ('onboarding.button.next', 'Next', 'التالي', 'ui', NULL),
  ('onboarding.button.save_continue', 'Save & Continue', 'حفظ ومتابعة', 'ui', NULL),
  ('onboarding.button.back_to_edit', 'Back to Edit', 'العودة للتعديل', 'ui', NULL),
  ('onboarding.button.approve_provision', 'Approve & Provision', 'الموافقة والتهيئة', 'ui', NULL),
  ('onboarding.button.skip', 'Skip', 'تخطي', 'ui', NULL),

  -- Stage Status
  ('onboarding.stage.not_started', 'Not Started', 'لم يبدأ', 'ui', NULL),
  ('onboarding.stage.in_progress', 'In Progress', 'قيد التنفيذ', 'ui', NULL),
  ('onboarding.stage.completed', 'Completed', 'مكتمل', 'ui', NULL),
  ('onboarding.stage.locked', 'Locked', 'مقفل', 'ui', NULL),

  -- Review Stage
  ('onboarding.review.title', 'Review & Confirm', 'مراجعة وتأكيد', 'ui', NULL),
  ('onboarding.review.subtitle', 'Review your setup before provisioning the workspace',
   'راجع الإعدادات قبل إنشاء مساحة العمل', 'ui', NULL),
  ('onboarding.review.blockers_title', 'Blockers to Resolve', 'عوائق يجب حلها', 'ui', NULL),
  ('onboarding.review.readiness_score', 'Readiness Score', 'درجة الجاهزية', 'ui', NULL),
  ('onboarding.review.impact_summary', 'Impact Summary', 'ملخص التأثير', 'ui', NULL),
  ('onboarding.review.organization', 'Organization', 'الجهة', 'ui', NULL),
  ('onboarding.review.recommendations', 'Recommendations', 'التوصيات', 'ui', NULL),

  -- Impact Labels
  ('onboarding.impact.frameworks', 'Frameworks', 'أطر', 'ui', NULL),
  ('onboarding.impact.departments', 'Departments', 'إدارات', 'ui', NULL),
  ('onboarding.impact.modules', 'Modules', 'وحدات', 'ui', NULL),
  ('onboarding.impact.invites', 'Invites', 'دعوات', 'ui', NULL),

  -- Organization Fields
  ('onboarding.field.name', 'Name', 'الاسم', 'ui', NULL),
  ('onboarding.field.country', 'Country', 'الدولة', 'ui', NULL),
  ('onboarding.field.industry', 'Industry', 'القطاع', 'ui', NULL),
  ('onboarding.field.slug', 'Slug', 'المعرف', 'ui', NULL),
  ('onboarding.field.city', 'City', 'المدينة', 'ui', NULL),
  ('onboarding.field.timezone', 'Timezone', 'المنطقة الزمنية', 'ui', NULL),

  -- Provisioning
  ('onboarding.provisioning.title', 'Provisioning Workspace', 'تهيئة مساحة العمل', 'ui', NULL),
  ('onboarding.provisioning.subtitle', 'Creating your workspace...', 'جارٍ إنشاء مساحة العمل...', 'ui', NULL),
  ('onboarding.provisioning.ready_title', 'Workspace Ready!', 'مساحة العمل جاهزة!', 'message', NULL),
  ('onboarding.provisioning.ready_message', 'Your workspace has been created successfully.',
   'تم إنشاء مساحة العمل بنجاح.', 'message', NULL),
  ('onboarding.provisioning.failed_title', 'Provisioning Failed', 'فشلت التهيئة', 'error', NULL),
  ('onboarding.provisioning.failed_message', 'An error occurred during provisioning. Please retry.',
   'حدث خطأ أثناء التهيئة. يرجى إعادة المحاولة.', 'error', NULL),
  ('onboarding.provisioning.open_workspace', 'Open Workspace', 'فتح مساحة العمل', 'ui', NULL),
  ('onboarding.provisioning.retry', 'Retry', 'إعادة المحاولة', 'ui', NULL),

  -- Step Status
  ('onboarding.step.queued', 'Queued', 'في الانتظار', 'ui', NULL),
  ('onboarding.step.running', 'Running', 'قيد التشغيل', 'ui', NULL),
  ('onboarding.step.completed', 'Completed', 'مكتمل', 'ui', NULL),
  ('onboarding.step.failed', 'Failed', 'فشل', 'ui', NULL),

  -- Right Intelligence Panel
  ('onboarding.intelligence.title', 'Live Intelligence', 'الذكاء المباشر', 'ui', NULL),
  ('onboarding.intelligence.blockers', 'Blockers', 'عوائق', 'ui', '{count}'),
  ('onboarding.intelligence.scores', 'Scores', 'الدرجات', 'ui', NULL),
  ('onboarding.intelligence.recommendations', 'Recommendations', 'التوصيات', 'ui', NULL),
  ('onboarding.intelligence.answers', 'Answers', 'الإجابات', 'ui', '{count}'),

  -- General Messages
  ('onboarding.loading', 'Loading...', 'جارٍ التحميل...', 'message', NULL),
  ('onboarding.loading.questions', 'Loading questions...', 'جارٍ تحميل الأسئلة...', 'message', NULL),
  ('onboarding.loading.session', 'Loading session...', 'جارٍ تحميل الجلسة...', 'message', NULL),
  ('onboarding.no_questions', 'No questions loaded for this stage yet. You may proceed.',
   'لم يتم تحميل الأسئلة بعد لهذه المرحلة. يمكنك المتابعة.', 'message', NULL),

  -- Placeholders
  ('onboarding.placeholder.select', 'Select...', 'اختر...', 'placeholder', NULL),
  ('onboarding.placeholder.enter_text', 'Enter text...', 'أدخل النص...', 'placeholder', NULL),
  ('onboarding.placeholder.search', 'Search...', 'بحث...', 'placeholder', NULL),

  -- Validation Messages
  ('onboarding.validation.required', 'This field is required', 'هذا الحقل مطلوب', 'validation', NULL),
  ('onboarding.validation.email', 'Please enter a valid email address',
   'يرجى إدخال عنوان بريد إلكتروني صحيح', 'validation', NULL),
  ('onboarding.validation.min_length', 'Minimum {min} characters required',
   'الحد الأدنى {min} حرف مطلوب', 'validation', '{min}'),
  ('onboarding.validation.max_length', 'Maximum {max} characters allowed',
   'الحد الأقصى {max} حرف مسموح', 'validation', '{max}'),

  -- Help Text
  ('onboarding.help.required_field', 'Fields marked with * are required',
   'الحقول المعلمة بـ * مطلوبة', 'help', NULL),
  ('onboarding.help.autosave', 'Your answers are automatically saved',
   'يتم حفظ إجاباتك تلقائيًا', 'help', NULL),

  -- Error Messages
  ('onboarding.error.session_not_found', 'Session not found', 'الجلسة غير موجودة', 'error', NULL),
  ('onboarding.error.save_failed', 'Failed to save answers', 'فشل حفظ الإجابات', 'error', NULL),
  ('onboarding.error.load_failed', 'Failed to load data', 'فشل تحميل البيانات', 'error', NULL),
  ('onboarding.error.provisioning_failed', 'Provisioning failed: {error}',
   'فشلت التهيئة: {error}', 'error', '{error}'),

  -- Tooltips
  ('onboarding.tooltip.progress', 'Overall progress through onboarding',
   'التقدم الإجمالي خلال عملية الإعداد', 'tooltip', NULL),
  ('onboarding.tooltip.readiness', 'Your organization readiness score',
   'درجة جاهزية مؤسستك', 'tooltip', NULL),
  ('onboarding.tooltip.save_status', 'Auto-save status', 'حالة الحفظ التلقائي', 'tooltip', NULL);

-- =====================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_onboarding_stage_definitions_updated_at
  BEFORE UPDATE ON onboarding_stage_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provisioning_step_definitions_updated_at
  BEFORE UPDATE ON provisioning_step_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_ui_config_updated_at
  BEFORE UPDATE ON onboarding_ui_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_translations_updated_at
  BEFORE UPDATE ON onboarding_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_tenant_overrides_updated_at
  BEFORE UPDATE ON onboarding_tenant_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE AUDIT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION audit_config_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO onboarding_config_audit(table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO onboarding_config_audit(table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO onboarding_config_audit(table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to all configuration tables
CREATE TRIGGER audit_stage_definitions
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_stage_definitions
  FOR EACH ROW EXECUTE FUNCTION audit_config_changes();

CREATE TRIGGER audit_provisioning_steps
  AFTER INSERT OR UPDATE OR DELETE ON provisioning_step_definitions
  FOR EACH ROW EXECUTE FUNCTION audit_config_changes();

CREATE TRIGGER audit_ui_config
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_ui_config
  FOR EACH ROW EXECUTE FUNCTION audit_config_changes();

CREATE TRIGGER audit_translations
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_translations
  FOR EACH ROW EXECUTE FUNCTION audit_config_changes();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Grant appropriate permissions to application user
-- Replace 'app_user' with your actual application database user
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- =====================================================
-- END OF MIGRATION
-- =====================================================