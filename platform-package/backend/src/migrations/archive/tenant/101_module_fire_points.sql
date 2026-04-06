-- 101_module_fire_points.sql
-- Fire Points: module_kickstart_log + module_contact_points

CREATE TABLE IF NOT EXISTS module_kickstart_log (
  log_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code         VARCHAR(50) NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending',
  kicked_at           TIMESTAMPTZ,
  kicked_by           VARCHAR(255),
  artifacts_created   JSONB,
  errors              JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_module_kickstart UNIQUE (module_code)
);

CREATE TABLE IF NOT EXISTS module_contact_points (
  contact_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code         VARCHAR(50) NOT NULL,
  owner_user_id       VARCHAR(255),
  owner_team_id       UUID,
  owner_role          VARCHAR(100),
  backup_user_id      VARCHAR(255),
  backup_team_id      UUID,
  escalation_role_id  VARCHAR(100),
  escalation_team_id  UUID,
  notification_email  BOOLEAN DEFAULT true,
  onboarding_question_code VARCHAR(150),
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_owner_defined CHECK (
    owner_user_id IS NOT NULL OR owner_team_id IS NOT NULL OR owner_role IS NOT NULL
  ),
  CONSTRAINT uq_module_contact UNIQUE (module_code)
);
