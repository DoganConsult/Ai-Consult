ALTER TABLE public.email_verification_tokens
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(64) DEFAULT 'email_verification';

CREATE UNIQUE INDEX IF NOT EXISTS idx_evt_user_purpose
  ON public.email_verification_tokens (user_id, purpose)
  WHERE purpose = 'mfa_login';
