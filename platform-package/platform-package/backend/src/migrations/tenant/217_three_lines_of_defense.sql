-- Three Lines of Defense (3LoD) model
-- Line 1: Business Operations (own and manage risks)
-- Line 2: Risk & Compliance (oversight functions)
-- Line 3: Internal Audit (independent assurance)

CREATE TABLE IF NOT EXISTS defense_lines (
  line_number    SMALLINT PRIMARY KEY CHECK (line_number BETWEEN 1 AND 3),
  name_en        VARCHAR(100) NOT NULL,
  name_ar        VARCHAR(100),
  description_en TEXT,
  description_ar TEXT,
  color          VARCHAR(7)
);

INSERT INTO defense_lines (line_number, name_en, name_ar, description_en, description_ar, color) VALUES
  (1, '1st Line: Business Operations',
      'خط الدفاع الأول: العمليات التجارية',
      'Business units and operational management who own and manage risks',
      'وحدات الأعمال والإدارة التشغيلية المسؤولة عن إدارة المخاطر',
      '#3b82f6'),
  (2, '2nd Line: Risk & Compliance',
      'خط الدفاع الثاني: المخاطر والامتثال',
      'Risk management, compliance, and oversight functions',
      'إدارة المخاطر والامتثال ووظائف الرقابة',
      '#f59e0b'),
  (3, '3rd Line: Internal Audit',
      'خط الدفاع الثالث: التدقيق الداخلي',
      'Independent assurance through internal and external audit',
      'ضمان مستقل من خلال التدقيق الداخلي والخارجي',
      '#ef4444')
ON CONFLICT (line_number) DO NOTHING;

CREATE TABLE IF NOT EXISTS role_defense_line_mappings (
  role_code    VARCHAR(50)  NOT NULL,
  defense_line SMALLINT     NOT NULL REFERENCES defense_lines(line_number),
  is_primary   BOOLEAN      NOT NULL DEFAULT true,
  PRIMARY KEY (role_code, defense_line)
);

-- Default role-to-line mappings
INSERT INTO role_defense_line_mappings (role_code, defense_line, is_primary) VALUES
  ('admin', 1, true),
  ('owner', 1, true),
  ('executive_owner', 1, true),
  ('grc_manager', 1, true),
  ('compliance_officer', 2, true),
  ('risk_manager', 2, true),
  ('auditor', 3, true)
ON CONFLICT DO NOTHING;

-- Add defense_line column to roles table for quick lookup
DO $$ BEGIN
  ALTER TABLE roles ADD COLUMN IF NOT EXISTS defense_line SMALLINT;
EXCEPTION WHEN others THEN NULL;
END $$;

UPDATE roles SET defense_line = 1 WHERE role_code IN ('admin', 'owner', 'executive_owner', 'grc_manager') AND defense_line IS NULL;
UPDATE roles SET defense_line = 2 WHERE role_code IN ('compliance_officer', 'risk_manager') AND defense_line IS NULL;
UPDATE roles SET defense_line = 3 WHERE role_code IN ('auditor') AND defense_line IS NULL;
