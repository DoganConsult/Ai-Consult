-- Migration 068: Add visibility_rule_json to existing onboarding_stage_definitions
-- and ensure all 10 stages are seeded with bilingual labels and visibility rules.

-- Add visibility_rule_json column if not exists
ALTER TABLE public.onboarding_stage_definitions
  ADD COLUMN IF NOT EXISTS visibility_rule_json JSONB DEFAULT '{}'::jsonb;

-- Upsert all 10 stages (table already exists with id UUID PK + stage_code UNIQUE)
INSERT INTO public.onboarding_stage_definitions (id, stage_code, sort_order, label_en, label_ar, description_en, description_ar, icon_class, is_required, visibility_rule_json)
VALUES
  (gen_random_uuid(), 'organization_identity', 0, 'Organization Identity', 'هوية المنظمة', 'Basic information about your organization', 'معلومات أساسية عن مؤسستك', 'pi pi-building', true, '{}'::jsonb),
  (gen_random_uuid(), 'regulatory_scope', 1, 'Regulatory Scope', 'النطاق التنظيمي', 'Jurisdictions and regulatory requirements', 'الاختصاصات القضائية والمتطلبات التنظيمية', 'pi pi-shield', true, '{}'::jsonb),
  (gen_random_uuid(), 'org_structure', 2, 'Organization Structure', 'الهيكل التنظيمي', 'Departments, entities, and locations', 'الأقسام والكيانات والمواقع', 'pi pi-sitemap', true, '{}'::jsonb),
  (gen_random_uuid(), 'technology_landscape', 3, 'Technology Landscape', 'المشهد التقني', 'Systems, tools, and integrations', 'الأنظمة والأدوات والتكاملات', 'pi pi-server', true, '{}'::jsonb),
  (gen_random_uuid(), 'governance_model', 4, 'Governance Model', 'نموذج الحوكمة', 'Committees, approval chains, and oversight', 'اللجان وسلاسل الموافقة والرقابة', 'pi pi-users', true,
    '{"any":[{"question_code":"org.employee_band","in":["201-1000","1001-5000","5000+"]},{"question_code":"gov.has_risk_committee","equals":true}]}'::jsonb),
  (gen_random_uuid(), 'risk_compliance_maturity', 5, 'Risk & Compliance Maturity', 'نضج المخاطر والامتثال', 'Current maturity level and readiness', 'مستوى النضج الحالي والجاهزية', 'pi pi-chart-bar', true, '{}'::jsonb),
  (gen_random_uuid(), 'operating_model', 6, 'Operating Model', 'نموذج التشغيل', 'Processes, cadences, and operational settings', 'العمليات والإيقاعات والإعدادات التشغيلية', 'pi pi-cog', true, '{}'::jsonb),
  (gen_random_uuid(), 'people_ownership', 7, 'People & Ownership', 'الأشخاص والملكية', 'Team assignments and responsibility matrix', 'تعيينات الفريق ومصفوفة المسؤوليات', 'pi pi-id-card', true,
    '{"any":[{"question_code":"org.employee_band","in":["51-200","201-1000","1001-5000","5000+"]}]}'::jsonb),
  (gen_random_uuid(), 'review_confirmation', 8, 'Review & Confirmation', 'المراجعة والتأكيد', 'Review all answers before provisioning', 'مراجعة جميع الإجابات قبل التهيئة', 'pi pi-check-circle', true, '{}'::jsonb),
  (gen_random_uuid(), 'provision_workspace', 9, 'Provision Workspace', 'تهيئة مساحة العمل', 'Build and activate your workspace', 'بناء وتفعيل مساحة العمل', 'pi pi-bolt', true, '{}'::jsonb)
ON CONFLICT (stage_code) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  icon_class = EXCLUDED.icon_class,
  is_required = EXCLUDED.is_required,
  visibility_rule_json = EXCLUDED.visibility_rule_json;
