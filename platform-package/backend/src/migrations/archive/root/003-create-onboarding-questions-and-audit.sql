-- =====================================================
-- DEPRECATED — Legacy onboarding question/audit tables
-- =====================================================
-- Superseded by master/003_onboarding_v2_tables.sql
-- Legacy routers (question.routes.ts, session.routes.ts)
-- that consumed these tables have been removed.
-- Kept for reference; do NOT run on new environments.
-- =====================================================
--
-- ORIGINAL DESCRIPTION:
-- This migration creates a complete question bank system
-- with full audit trail for all user responses
-- =====================================================

-- 1. QUESTION TYPES DEFINITION
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_question_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code VARCHAR(50) UNIQUE NOT NULL,
  type_name VARCHAR(100) NOT NULL,
  description TEXT,
  validation_rules JSONB DEFAULT '{}',
  ui_component VARCHAR(100), -- text, select, multiselect, radio, checkbox, date, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. QUESTION BANK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_code VARCHAR(100) UNIQUE NOT NULL,
  stage_code VARCHAR(100) NOT NULL REFERENCES onboarding_stage_definitions(stage_code),
  question_type_id UUID NOT NULL REFERENCES onboarding_question_types(id),

  -- Question text in multiple languages
  question_text_en TEXT NOT NULL,
  question_text_ar TEXT NOT NULL,
  help_text_en TEXT,
  help_text_ar TEXT,
  placeholder_en VARCHAR(255),
  placeholder_ar VARCHAR(255),
  tooltip_en TEXT,
  tooltip_ar TEXT,

  -- Configuration
  is_required BOOLEAN DEFAULT true,
  is_conditional BOOLEAN DEFAULT false,
  condition_rules JSONB DEFAULT '{}', -- Rules for when to show this question
  validation_rules JSONB DEFAULT '{}', -- Specific validation for this question
  default_value TEXT,

  -- Lookup configuration
  lookup_table VARCHAR(100), -- Name of lookup table if applicable
  lookup_filter JSONB DEFAULT '{}', -- Filters to apply on lookup
  allow_custom_value BOOLEAN DEFAULT false, -- Allow user to enter custom value

  -- Display configuration
  display_order INTEGER NOT NULL,
  display_group VARCHAR(100), -- Group related questions
  display_width VARCHAR(20) DEFAULT 'full', -- full, half, third
  icon_class VARCHAR(100),

  -- Metadata
  impacts_provisioning BOOLEAN DEFAULT false,
  impacts_compliance BOOLEAN DEFAULT false,
  compliance_frameworks JSONB DEFAULT '[]', -- Related compliance frameworks
  tags JSONB DEFAULT '[]',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Create indexes
CREATE INDEX idx_questions_stage ON onboarding_questions(stage_code);
CREATE INDEX idx_questions_type ON onboarding_questions(question_type_id);
CREATE INDEX idx_questions_active ON onboarding_questions(is_active) WHERE is_active = true;
CREATE INDEX idx_questions_order ON onboarding_questions(stage_code, display_order);
CREATE INDEX idx_questions_group ON onboarding_questions(display_group);

-- 3. QUESTION OPTIONS TABLE (for select, radio, checkbox questions)
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES onboarding_questions(id) ON DELETE CASCADE,
  option_code VARCHAR(100) NOT NULL,
  option_value TEXT NOT NULL,
  option_label_en TEXT NOT NULL,
  option_label_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  icon_class VARCHAR(100),
  color_code VARCHAR(7),

  -- Related data
  triggers_questions JSONB DEFAULT '[]', -- Questions to show if this option selected
  impacts JSONB DEFAULT '{}', -- What this selection impacts
  metadata JSONB DEFAULT '{}',

  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_question_options_question ON onboarding_question_options(question_id);
CREATE INDEX idx_question_options_active ON onboarding_question_options(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_question_options_unique ON onboarding_question_options(question_id, option_code);

-- 4. USER ANSWERS TABLE (Current state)
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tenant_id UUID,
  question_id UUID NOT NULL REFERENCES onboarding_questions(id),
  question_code VARCHAR(100) NOT NULL,

  -- Answer storage (flexible for different types)
  answer_value TEXT,
  answer_json JSONB, -- For complex answers (multi-select, nested data)
  answer_type VARCHAR(50), -- text, number, boolean, date, json, array

  -- Validation status
  is_valid BOOLEAN DEFAULT true,
  validation_errors JSONB DEFAULT '[]',
  validation_timestamp TIMESTAMPTZ,

  -- Metadata
  time_spent_seconds INTEGER, -- Time spent on this question
  change_count INTEGER DEFAULT 0, -- Number of times changed
  source VARCHAR(50) DEFAULT 'manual', -- manual, import, api, default

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX idx_user_answers_session ON onboarding_user_answers(session_id);
CREATE INDEX idx_user_answers_user ON onboarding_user_answers(user_id);
CREATE INDEX idx_user_answers_tenant ON onboarding_user_answers(tenant_id);
CREATE INDEX idx_user_answers_question ON onboarding_user_answers(question_id);
CREATE UNIQUE INDEX idx_user_answers_unique ON onboarding_user_answers(session_id, question_id);

-- 5. ANSWER HISTORY TABLE (Complete audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_answer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES onboarding_user_answers(id),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tenant_id UUID,
  question_id UUID NOT NULL,
  question_code VARCHAR(100) NOT NULL,

  -- Historical answer
  answer_value TEXT,
  answer_json JSONB,
  answer_type VARCHAR(50),

  -- Change information
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VALIDATE')),
  previous_value TEXT,
  previous_json JSONB,
  change_reason TEXT,

  -- Context
  ip_address INET,
  user_agent TEXT,
  session_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_answer_history_answer ON onboarding_answer_history(answer_id);
CREATE INDEX idx_answer_history_session ON onboarding_answer_history(session_id);
CREATE INDEX idx_answer_history_user ON onboarding_answer_history(user_id);
CREATE INDEX idx_answer_history_question ON onboarding_answer_history(question_id);
CREATE INDEX idx_answer_history_created ON onboarding_answer_history(created_at);
CREATE INDEX idx_answer_history_action ON onboarding_answer_history(action);

-- 6. ONBOARDING SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  tenant_id UUID,

  -- Session state
  current_stage VARCHAR(100),
  current_question_index INTEGER DEFAULT 0,
  completed_stages JSONB DEFAULT '[]',
  session_status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, abandoned, expired

  -- Progress tracking
  total_questions INTEGER DEFAULT 0,
  answered_questions INTEGER DEFAULT 0,
  required_questions INTEGER DEFAULT 0,
  required_answered INTEGER DEFAULT 0,
  completion_percentage NUMERIC(5,2) DEFAULT 0,

  -- Readiness scores
  overall_readiness_score NUMERIC(5,2) DEFAULT 0,
  stage_scores JSONB DEFAULT '{}',
  category_scores JSONB DEFAULT '{}',

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_time_spent_seconds INTEGER DEFAULT 0,

  -- Provisioning
  provisioning_status VARCHAR(50), -- pending, in_progress, completed, failed
  provisioning_started_at TIMESTAMPTZ,
  provisioning_completed_at TIMESTAMPTZ,
  provisioning_result JSONB,

  -- Metadata
  source VARCHAR(50) DEFAULT 'web', -- web, mobile, api, import
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON onboarding_sessions(user_id);
CREATE INDEX idx_sessions_tenant ON onboarding_sessions(tenant_id);
CREATE INDEX idx_sessions_status ON onboarding_sessions(session_status);
CREATE INDEX idx_sessions_created ON onboarding_sessions(created_at);
CREATE INDEX idx_sessions_expires ON onboarding_sessions(expires_at) WHERE expires_at IS NOT NULL;

-- 7. FIELD GUIDANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_field_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES onboarding_questions(id) ON DELETE CASCADE,
  field_name VARCHAR(100),

  -- Guidance content
  guidance_type VARCHAR(50) CHECK (guidance_type IN ('help', 'example', 'warning', 'best_practice', 'compliance')),
  title_en VARCHAR(255),
  title_ar VARCHAR(255),
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,

  -- Examples
  example_values JSONB DEFAULT '[]',

  -- Display configuration
  show_icon BOOLEAN DEFAULT true,
  icon_class VARCHAR(100),
  color_class VARCHAR(100),
  position VARCHAR(20) DEFAULT 'tooltip', -- tooltip, inline, modal
  trigger_event VARCHAR(20) DEFAULT 'hover', -- hover, click, focus

  -- Conditions
  show_condition JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guidance_question ON onboarding_field_guidance(question_id);
CREATE INDEX idx_guidance_field ON onboarding_field_guidance(field_name);
CREATE INDEX idx_guidance_type ON onboarding_field_guidance(guidance_type);
CREATE INDEX idx_guidance_active ON onboarding_field_guidance(is_active) WHERE is_active = true;

-- 8. COMPLIANCE MAPPING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_compliance_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES onboarding_questions(id),
  framework_code VARCHAR(50) NOT NULL,
  requirement_id VARCHAR(100),
  requirement_text TEXT,
  criticality VARCHAR(20) CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  evidence_required BOOLEAN DEFAULT false,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_question ON onboarding_compliance_mapping(question_id);
CREATE INDEX idx_compliance_framework ON onboarding_compliance_mapping(framework_code);
CREATE INDEX idx_compliance_criticality ON onboarding_compliance_mapping(criticality);

-- 9. DYNAMIC LOOKUPS TABLE (For custom lookups)
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_dynamic_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_code VARCHAR(100) UNIQUE NOT NULL,
  lookup_name_en VARCHAR(255) NOT NULL,
  lookup_name_ar VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  parent_lookup_code VARCHAR(100),

  -- Value
  value_code VARCHAR(100) NOT NULL,
  value_text_en TEXT NOT NULL,
  value_text_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags JSONB DEFAULT '[]',

  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dynamic_lookups_code ON onboarding_dynamic_lookups(lookup_code);
CREATE INDEX idx_dynamic_lookups_category ON onboarding_dynamic_lookups(category);
CREATE INDEX idx_dynamic_lookups_parent ON onboarding_dynamic_lookups(parent_lookup_code);
CREATE INDEX idx_dynamic_lookups_active ON onboarding_dynamic_lookups(is_active) WHERE is_active = true;

-- =====================================================
-- SEED DATA - QUESTION TYPES
-- =====================================================
INSERT INTO onboarding_question_types (type_code, type_name, ui_component, validation_rules) VALUES
  ('TEXT', 'Text Input', 'text', '{"maxLength": 255}'),
  ('TEXTAREA', 'Long Text', 'textarea', '{"maxLength": 4000}'),
  ('NUMBER', 'Number', 'number', '{"min": 0}'),
  ('EMAIL', 'Email', 'email', '{"pattern": "email"}'),
  ('PHONE', 'Phone Number', 'phone', '{"pattern": "phone"}'),
  ('DATE', 'Date', 'date', '{}'),
  ('SELECT', 'Single Select', 'select', '{}'),
  ('MULTISELECT', 'Multiple Select', 'multiselect', '{}'),
  ('RADIO', 'Radio Buttons', 'radio', '{}'),
  ('CHECKBOX', 'Checkboxes', 'checkbox', '{}'),
  ('BOOLEAN', 'Yes/No', 'boolean', '{}'),
  ('FILE', 'File Upload', 'file', '{"maxSize": 10485760}'),
  ('COUNTRY', 'Country Select', 'country-select', '{}'),
  ('CITY', 'City Select', 'city-select', '{}'),
  ('SECTOR', 'Industry Sector', 'sector-select', '{}'),
  ('FRAMEWORK', 'Framework Select', 'framework-select', '{}'),
  ('TIMEZONE', 'Timezone Select', 'timezone-select', '{}'),
  ('LANGUAGE', 'Language Select', 'language-select', '{}'),
  ('CURRENCY', 'Currency Select', 'currency-select', '{}'),
  ('EMPLOYEE_RANGE', 'Employee Range', 'employee-range', '{}')
ON CONFLICT (type_code) DO NOTHING;

-- =====================================================
-- SEED DATA - ORGANIZATION IDENTITY QUESTIONS
-- =====================================================
INSERT INTO onboarding_questions (
  question_code, stage_code, question_type_id,
  question_text_en, question_text_ar,
  help_text_en, help_text_ar,
  placeholder_en, placeholder_ar,
  tooltip_en, tooltip_ar,
  is_required, display_order, display_group,
  lookup_table, validation_rules, impacts_provisioning
) VALUES
  -- Legal Entity Name
  ('ORG_LEGAL_NAME', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'TEXT'),
   'Legal Entity Name', 'اسم الكيان القانوني',
   'Enter the official registered name of your organization', 'أدخل الاسم الرسمي المسجل لمؤسستك',
   'e.g., Saudi Technology Company LLC', 'مثال: شركة التقنية السعودية ذ.م.م',
   'Official name as registered with authorities', 'الاسم الرسمي كما هو مسجل لدى الجهات الرسمية',
   true, 1, 'basic_info', NULL,
   '{"minLength": 3, "maxLength": 255, "pattern": "^[a-zA-Z0-9\\s\\.\\-&,()]+$"}',
   true),

  -- Display Name
  ('ORG_DISPLAY_NAME', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'TEXT'),
   'Display Name', 'الاسم المعروض',
   'Short name to be displayed in the platform', 'الاسم المختصر المستخدم في المنصة',
   'e.g., STC', 'مثال: إس تي سي',
   'How your organization name appears in the system', 'كيف يظهر اسم مؤسستك في النظام',
   true, 2, 'basic_info', NULL,
   '{"minLength": 2, "maxLength": 100}',
   true),

  -- Arabic Name
  ('ORG_NAME_AR', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'TEXT'),
   'Organization Name (Arabic)', 'اسم المنظمة بالعربية',
   'Enter organization name in Arabic', 'أدخل اسم المنظمة بالعربية',
   'اسم المنظمة', 'Organization name',
   'Arabic version of organization name', 'النسخة العربية من اسم المنظمة',
   false, 3, 'basic_info', NULL,
   '{"maxLength": 255, "rtl": true}',
   false),

  -- Country
  ('ORG_COUNTRY', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'COUNTRY'),
   'Country', 'الدولة',
   'Select the country where your organization is registered', 'اختر الدولة التي تم تسجيل مؤسستك فيها',
   'Select country...', 'اختر الدولة...',
   'Primary country of operation', 'البلد الرئيسي للعمليات',
   true, 4, 'location', 'lookup_countries',
   '{"required": true}',
   true),

  -- City
  ('ORG_CITY', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'CITY'),
   'City', 'المدينة',
   'Select your primary city of operation', 'اختر المدينة الرئيسية لعملياتك',
   'Select city...', 'اختر المدينة...',
   'Main office location', 'موقع المكتب الرئيسي',
   true, 5, 'location', 'lookup_cities',
   '{"required": true, "dependsOn": "ORG_COUNTRY"}',
   true),

  -- Industry Sector
  ('ORG_SECTOR', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'SECTOR'),
   'Industry Sector', 'القطاع / الصناعة',
   'Select your primary industry sector', 'اختر القطاع الصناعي الرئيسي',
   'Start typing to search sectors...', 'ابدأ بالكتابة للبحث عن القطاعات...',
   'Primary business sector for compliance mapping', 'القطاع التجاري الرئيسي لتعيين الامتثال',
   true, 6, 'business', 'lookup_sectors',
   '{"required": true, "searchable": true}',
   true),

  -- Sub-Sector
  ('ORG_SUBSECTOR', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'SECTOR'),
   'Sub-Sector', 'القطاع الفرعي',
   'Select your specific sub-sector if applicable', 'اختر القطاع الفرعي المحدد إن وجد',
   'Select sub-sector...', 'اختر القطاع الفرعي...',
   'Specific area within your industry', 'المجال المحدد ضمن صناعتك',
   false, 7, 'business', 'lookup_sectors',
   '{"dependsOn": "ORG_SECTOR", "filter": {"parent": "ORG_SECTOR"}}',
   true),

  -- Number of Employees
  ('ORG_EMPLOYEE_COUNT', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'EMPLOYEE_RANGE'),
   'Number of Employees', 'عدد الموظفين',
   'Select the range that best represents your organization size', 'اختر النطاق الذي يمثل حجم مؤسستك',
   'Select range...', 'اختر النطاق...',
   'Total employee count across all locations', 'إجمالي عدد الموظفين في جميع المواقع',
   true, 8, 'business', 'lookup_employee_ranges',
   '{"required": true}',
   true),

  -- Organization Identifier
  ('ORG_IDENTIFIER', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'TEXT'),
   'Organization Identifier', 'معرّف الجهة',
   'Unique identifier for workspace URL (lowercase, no spaces)', 'معرّف فريد لرابط مساحة العمل (أحرف صغيرة، بدون مسافات)',
   'e.g., saudi-tech-co', 'مثال: saudi-tech-co',
   'This will be part of your workspace URL', 'سيكون هذا جزءًا من عنوان URL لمساحة العمل',
   true, 9, 'technical', NULL,
   '{"required": true, "pattern": "^[a-z0-9-]+$", "minLength": 3, "maxLength": 50, "unique": true}',
   true),

  -- Timezone
  ('ORG_TIMEZONE', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'TIMEZONE'),
   'Timezone', 'المنطقة الزمنية',
   'Select your primary timezone', 'اختر المنطقة الزمنية الرئيسية',
   'Select timezone...', 'اختر المنطقة الزمنية...',
   'Default timezone for scheduling and reports', 'المنطقة الزمنية الافتراضية للجدولة والتقارير',
   true, 10, 'technical', 'lookup_timezones',
   '{"required": true}',
   true),

  -- Primary Language
  ('ORG_PRIMARY_LANGUAGE', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'LANGUAGE'),
   'Primary Language', 'اللغة الأساسية',
   'Select the primary language for your workspace', 'اختر اللغة الأساسية لمساحة العمل',
   'Select language...', 'اختر اللغة...',
   'Default language for users and content', 'اللغة الافتراضية للمستخدمين والمحتوى',
   true, 11, 'technical', 'lookup_languages',
   '{"required": true, "default": "en"}',
   true),

  -- Registration Number
  ('ORG_REGISTRATION_NO', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'TEXT'),
   'Commercial Registration Number', 'رقم السجل التجاري',
   'Enter your commercial registration or license number', 'أدخل رقم السجل التجاري أو الترخيص',
   'e.g., 1010123456', 'مثال: 1010123456',
   'Official registration number with authorities', 'رقم التسجيل الرسمي لدى الجهات',
   false, 12, 'compliance', NULL,
   '{"pattern": "^[A-Z0-9-/]+$"}',
   false),

  -- Tax Number
  ('ORG_TAX_NO', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'TEXT'),
   'Tax/VAT Number', 'الرقم الضريبي',
   'Enter your tax or VAT registration number', 'أدخل رقم التسجيل الضريبي أو ضريبة القيمة المضافة',
   'e.g., 300123456700003', 'مثال: 300123456700003',
   'Tax identification number', 'رقم التعريف الضريبي',
   false, 13, 'compliance', NULL,
   '{"pattern": "^[0-9]{15}$"}',
   false),

  -- Website
  ('ORG_WEBSITE', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'TEXT'),
   'Website', 'الموقع الإلكتروني',
   'Enter your organization website URL', 'أدخل عنوان موقع مؤسستك الإلكتروني',
   'https://www.example.com', 'https://www.example.com',
   'Main corporate website', 'الموقع الإلكتروني الرئيسي للشركة',
   false, 14, 'contact', NULL,
   '{"pattern": "^(https?://)?([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(/.*)?$", "patternMessage": "Enter a valid website (e.g. example.com or https://example.com)", "patternMessageAr": "أدخل موقعاً صالحاً (مثال: example.com أو https://example.com)", "type": "url"}',
   false),

  -- Main Phone
  ('ORG_PHONE', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'PHONE'),
   'Main Phone Number', 'رقم الهاتف الرئيسي',
   'Enter main contact phone number', 'أدخل رقم الهاتف الرئيسي للاتصال',
   '+966 XX XXX XXXX', '+966 XX XXX XXXX',
   'Primary contact number', 'رقم الاتصال الرئيسي',
   true, 15, 'contact', NULL,
   '{"pattern": "phone", "required": true}',
   false),

  -- Main Email
  ('ORG_EMAIL', 'organization_identity',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'EMAIL'),
   'Main Contact Email', 'البريد الإلكتروني الرئيسي',
   'Enter main contact email address', 'أدخل عنوان البريد الإلكتروني الرئيسي',
   'info@example.com', 'info@example.com',
   'Primary contact email', 'البريد الإلكتروني الرئيسي للاتصال',
   true, 16, 'contact', NULL,
   '{"pattern": "email", "required": true}',
   false);

-- =====================================================
-- SEED DATA - REGULATORY SCOPE QUESTIONS
-- =====================================================
INSERT INTO onboarding_questions (
  question_code, stage_code, question_type_id,
  question_text_en, question_text_ar,
  help_text_en, help_text_ar,
  is_required, display_order, display_group,
  lookup_table, impacts_compliance
) VALUES
  -- Operating Countries
  ('REG_OPERATING_COUNTRIES', 'regulatory_scope',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'MULTISELECT'),
   'Countries of Operation', 'دول العمليات',
   'Select all countries where your organization operates', 'اختر جميع الدول التي تعمل فيها مؤسستك',
   true, 1, 'jurisdiction', 'lookup_countries', true),

  -- Regulatory Frameworks
  ('REG_FRAMEWORKS', 'regulatory_scope',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'MULTISELECT'),
   'Applicable Regulatory Frameworks', 'الأطر التنظيمية المطبقة',
   'Select all regulatory frameworks that apply to your organization', 'اختر جميع الأطر التنظيمية التي تنطبق على مؤسستك',
   true, 2, 'frameworks', 'lookup_frameworks', true),

  -- Industry Regulations
  ('REG_INDUSTRY_SPECIFIC', 'regulatory_scope',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'MULTISELECT'),
   'Industry-Specific Regulations', 'اللوائح الخاصة بالصناعة',
   'Select industry-specific regulations you must comply with', 'اختر اللوائح الخاصة بالصناعة التي يجب الامتثال لها',
   false, 3, 'frameworks', 'onboarding_dynamic_lookups', true),

  -- Data Protection Laws
  ('REG_DATA_PROTECTION', 'regulatory_scope',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'MULTISELECT'),
   'Data Protection Laws', 'قوانين حماية البيانات',
   'Select applicable data protection regulations', 'اختر لوائح حماية البيانات المطبقة',
   true, 4, 'data_privacy', 'onboarding_dynamic_lookups', true),

  -- Certification Requirements
  ('REG_CERTIFICATIONS', 'regulatory_scope',
   (SELECT id FROM onboarding_question_types WHERE type_code = 'MULTISELECT'),
   'Required Certifications', 'الشهادات المطلوبة',
   'Select certifications required for your business', 'اختر الشهادات المطلوبة لعملك',
   false, 5, 'certifications', 'onboarding_dynamic_lookups', true);

-- =====================================================
-- SEED DATA - FIELD GUIDANCE
-- =====================================================
INSERT INTO onboarding_field_guidance (
  question_id, guidance_type,
  title_en, title_ar,
  content_en, content_ar,
  example_values, icon_class, position
) VALUES
  -- Legal Name Guidance
  ((SELECT id FROM onboarding_questions WHERE question_code = 'ORG_LEGAL_NAME'),
   'help', 'Legal Name Requirements', 'متطلبات الاسم القانوني',
   'Enter the exact name as it appears on your commercial registration or business license. This name will be used for all legal and compliance documentation.',
   'أدخل الاسم بالضبط كما يظهر في السجل التجاري أو رخصة العمل. سيتم استخدام هذا الاسم في جميع الوثائق القانونية والامتثال.',
   '["Saudi Aramco", "Saudi Basic Industries Corporation", "Al Rajhi Banking Corporation"]',
   'pi-info-circle', 'tooltip'),

  -- Organization Identifier Guidance
  ((SELECT id FROM onboarding_questions WHERE question_code = 'ORG_IDENTIFIER'),
   'best_practice', 'Choosing an Identifier', 'اختيار المعرف',
   'Use lowercase letters, numbers, and hyphens only. Keep it short and memorable. This cannot be changed later.',
   'استخدم الأحرف الصغيرة والأرقام والواصلات فقط. اجعله قصيرًا وسهل التذكر. لا يمكن تغيير هذا لاحقًا.',
   '["saudi-aramco", "sabic", "alrajhi-bank", "stc-group"]',
   'pi-lightbulb', 'inline'),

  -- Sector Selection Guidance
  ((SELECT id FROM onboarding_questions WHERE question_code = 'ORG_SECTOR'),
   'compliance', 'Sector Compliance Impact', 'تأثير امتثال القطاع',
   'Your sector selection determines applicable regulations and compliance frameworks. Choose the primary sector that best represents your core business.',
   'يحدد اختيار القطاع اللوائح وأطر الامتثال المطبقة. اختر القطاع الأساسي الذي يمثل عملك الأساسي بشكل أفضل.',
   '[]',
   'pi-shield', 'tooltip'),

  -- Registration Number Guidance
  ((SELECT id FROM onboarding_questions WHERE question_code = 'ORG_REGISTRATION_NO'),
   'example', 'Registration Number Format', 'تنسيق رقم التسجيل',
   'For Saudi Arabia: 10-digit number starting with city code. For UAE: License number from relevant authority.',
   'للمملكة العربية السعودية: رقم من 10 أرقام يبدأ برمز المدينة. للإمارات: رقم الترخيص من الجهة المختصة.',
   '["1010123456", "CN-1234567", "DED-789012"]',
   'pi-file-text', 'tooltip');

-- =====================================================
-- SEED DATA - DYNAMIC LOOKUPS
-- =====================================================
INSERT INTO onboarding_dynamic_lookups (
  lookup_code, lookup_name_en, lookup_name_ar,
  category, value_code, value_text_en, value_text_ar,
  sort_order
) VALUES
  -- Data Protection Laws
  ('DATA_PROTECTION_PDPL', 'Data Protection Laws', 'قوانين حماية البيانات',
   'data_protection', 'PDPL', 'Saudi Personal Data Protection Law', 'نظام حماية البيانات الشخصية السعودي', 1),
  ('DATA_PROTECTION_GDPR', 'Data Protection Laws', 'قوانين حماية البيانات',
   'data_protection', 'GDPR', 'General Data Protection Regulation (EU)', 'اللائحة العامة لحماية البيانات', 2),
  ('DATA_PROTECTION_CCPA', 'Data Protection Laws', 'قوانين حماية البيانات',
   'data_protection', 'CCPA', 'California Consumer Privacy Act', 'قانون خصوصية المستهلك في كاليفورنيا', 3),

  -- Certifications
  ('CERT_ISO27001', 'Certifications', 'الشهادات',
   'certifications', 'ISO27001', 'ISO 27001 - Information Security', 'ISO 27001 - أمن المعلومات', 1),
  ('CERT_ISO9001', 'Certifications', 'الشهادات',
   'certifications', 'ISO9001', 'ISO 9001 - Quality Management', 'ISO 9001 - إدارة الجودة', 2),
  ('CERT_SOC2', 'Certifications', 'الشهادات',
   'certifications', 'SOC2', 'SOC 2 Type II', 'SOC 2 النوع الثاني', 3),

  -- Operating Models
  ('OPMODEL_CENTRALIZED', 'Operating Models', 'نماذج التشغيل',
   'operating_models', 'CENTRALIZED', 'Centralized', 'مركزي', 1),
  ('OPMODEL_DECENTRALIZED', 'Operating Models', 'نماذج التشغيل',
   'operating_models', 'DECENTRALIZED', 'Decentralized', 'لامركزي', 2),
  ('OPMODEL_HYBRID', 'Operating Models', 'نماذج التشغيل',
   'operating_models', 'HYBRID', 'Hybrid', 'هجين', 3),

  -- Risk Appetite
  ('RISK_APPETITE_LOW', 'Risk Appetite', 'قبول المخاطر',
   'risk_appetite', 'LOW', 'Low/Conservative', 'منخفض/محافظ', 1),
  ('RISK_APPETITE_MEDIUM', 'Risk Appetite', 'قبول المخاطر',
   'risk_appetite', 'MEDIUM', 'Medium/Balanced', 'متوسط/متوازن', 2),
  ('RISK_APPETITE_HIGH', 'Risk Appetite', 'قبول المخاطر',
   'risk_appetite', 'HIGH', 'High/Aggressive', 'مرتفع/جريء', 3);

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger to update answer history
CREATE OR REPLACE FUNCTION track_answer_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO onboarding_answer_history(
      answer_id, session_id, user_id, tenant_id,
      question_id, question_code,
      answer_value, answer_json, answer_type,
      action, created_by
    ) VALUES (
      NEW.id, NEW.session_id, NEW.user_id, NEW.tenant_id,
      NEW.question_id, NEW.question_code,
      NEW.answer_value, NEW.answer_json, NEW.answer_type,
      'CREATE', NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.answer_value IS DISTINCT FROM NEW.answer_value OR
       OLD.answer_json IS DISTINCT FROM NEW.answer_json THEN
      INSERT INTO onboarding_answer_history(
        answer_id, session_id, user_id, tenant_id,
        question_id, question_code,
        answer_value, answer_json, answer_type,
        action, previous_value, previous_json, created_by
      ) VALUES (
        NEW.id, NEW.session_id, NEW.user_id, NEW.tenant_id,
        NEW.question_id, NEW.question_code,
        NEW.answer_value, NEW.answer_json, NEW.answer_type,
        'UPDATE', OLD.answer_value, OLD.answer_json, NEW.updated_by
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO onboarding_answer_history(
      answer_id, session_id, user_id, tenant_id,
      question_id, question_code,
      answer_value, answer_json, answer_type,
      action, created_by
    ) VALUES (
      OLD.id, OLD.session_id, OLD.user_id, OLD.tenant_id,
      OLD.question_id, OLD.question_code,
      OLD.answer_value, OLD.answer_json, OLD.answer_type,
      'DELETE', OLD.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_user_answer_changes
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_user_answers
  FOR EACH ROW EXECUTE FUNCTION track_answer_changes();

-- Trigger to update session progress
CREATE OR REPLACE FUNCTION update_session_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_total_questions INTEGER;
  v_answered_questions INTEGER;
  v_required_questions INTEGER;
  v_required_answered INTEGER;
  v_completion_percentage NUMERIC(5,2);
BEGIN
  -- Calculate progress metrics
  SELECT
    COUNT(*) FILTER (WHERE q.is_active = true),
    COUNT(*) FILTER (WHERE a.id IS NOT NULL),
    COUNT(*) FILTER (WHERE q.is_required = true AND q.is_active = true),
    COUNT(*) FILTER (WHERE q.is_required = true AND a.id IS NOT NULL)
  INTO
    v_total_questions,
    v_answered_questions,
    v_required_questions,
    v_required_answered
  FROM onboarding_questions q
  LEFT JOIN onboarding_user_answers a
    ON q.id = a.question_id
    AND a.session_id = NEW.session_id;

  -- Calculate completion percentage
  IF v_required_questions > 0 THEN
    v_completion_percentage := (v_required_answered::NUMERIC / v_required_questions::NUMERIC) * 100;
  ELSE
    v_completion_percentage := 0;
  END IF;

  -- Update session
  UPDATE onboarding_sessions
  SET
    total_questions = v_total_questions,
    answered_questions = v_answered_questions,
    required_questions = v_required_questions,
    required_answered = v_required_answered,
    completion_percentage = v_completion_percentage,
    last_activity_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_on_answer_change
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_user_answers
  FOR EACH ROW EXECUTE FUNCTION update_session_progress();

-- Updated_at triggers for all tables
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON onboarding_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_options_updated_at
  BEFORE UPDATE ON onboarding_question_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_answers_updated_at
  BEFORE UPDATE ON onboarding_user_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guidance_updated_at
  BEFORE UPDATE ON onboarding_field_guidance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dynamic_lookups_updated_at
  BEFORE UPDATE ON onboarding_dynamic_lookups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

-- View for question with all details
CREATE OR REPLACE VIEW v_onboarding_questions_full AS
SELECT
  q.id,
  q.question_code,
  q.stage_code,
  s.label_en as stage_name_en,
  s.label_ar as stage_name_ar,
  qt.type_name as question_type,
  qt.ui_component,
  q.question_text_en,
  q.question_text_ar,
  q.help_text_en,
  q.help_text_ar,
  q.is_required,
  q.display_order,
  q.display_group,
  q.lookup_table,
  q.validation_rules,
  q.impacts_provisioning,
  q.impacts_compliance,
  COUNT(DISTINCT g.id) as guidance_count,
  COUNT(DISTINCT o.id) as options_count
FROM onboarding_questions q
JOIN onboarding_stage_definitions s ON q.stage_code = s.stage_code
JOIN onboarding_question_types qt ON q.question_type_id = qt.id
LEFT JOIN onboarding_field_guidance g ON q.id = g.question_id
LEFT JOIN onboarding_question_options o ON q.id = o.question_id
WHERE q.is_active = true
GROUP BY q.id, s.label_en, s.label_ar, qt.type_name, qt.ui_component;

-- View for session progress
CREATE OR REPLACE VIEW v_onboarding_session_progress AS
SELECT
  s.id as session_id,
  s.user_id,
  s.tenant_id,
  s.session_status,
  s.current_stage,
  s.completion_percentage,
  s.overall_readiness_score,
  s.total_questions,
  s.answered_questions,
  s.required_questions,
  s.required_answered,
  s.started_at,
  s.last_activity_at,
  s.total_time_spent_seconds,
  COUNT(DISTINCT a.question_id) as unique_answers,
  SUM(a.change_count) as total_changes,
  MAX(a.updated_at) as last_answer_at
FROM onboarding_sessions s
LEFT JOIN onboarding_user_answers a ON s.id = a.session_id
GROUP BY s.id;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- =====================================================
-- END OF MIGRATION
-- =====================================================