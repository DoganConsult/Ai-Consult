-- Onboarding progress — save/resume wizard state (anonymous + authenticated)
-- Supports 30-day expiry; session_token is primary key for anonymous users

CREATE TABLE IF NOT EXISTS onboarding_progress (
  progress_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token    VARCHAR(64) NOT NULL UNIQUE,
  tenant_id        VARCHAR(64),
  user_id          VARCHAR(64),
  phase            INT NOT NULL DEFAULT 1,
  phase1_page      INT NOT NULL DEFAULT 0,
  answers          JSONB NOT NULL DEFAULT '{}',
  categories       JSONB,
  active_category_key VARCHAR(64),
  cat_page        INT DEFAULT 0,
  category_status JSONB DEFAULT '{}',
  assessment_id    UUID,
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_session ON onboarding_progress(session_token);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_expires ON onboarding_progress(expires_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_tenant_user ON onboarding_progress(tenant_id, user_id) WHERE tenant_id IS NOT NULL;
