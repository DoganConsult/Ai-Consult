-- Migration 101: DAuth session infrastructure — token_blacklist and sessions tables
-- P0 fix: these tables are required by session.service.ts and token-blacklist.service.ts
-- Without them, token revocation silently fails and sessions cannot be persisted or audited.

BEGIN;

-- ============================================================================
-- 1. token_blacklist
-- Used by token-blacklist.service.ts for:
--   - blacklistToken()         : mark JTI as revoked on logout / refresh
--   - isTokenBlacklisted()     : checked by authenticate() middleware
--   - registerActiveJtiForUser(): track active access tokens per user
--   - removeActiveJtiForUser() : clear active marker on refresh
--   - revokeAllUserTokens()    : forced logout / account lock
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.token_blacklist (
  jti          VARCHAR(128)  NOT NULL,
  user_id      VARCHAR(64),
  expires_at   TIMESTAMPTZ   NOT NULL,
  is_active    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_token_blacklist PRIMARY KEY (jti)
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_user
  ON public.token_blacklist (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires
  ON public.token_blacklist (expires_at);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_active_user
  ON public.token_blacklist (user_id, is_active)
  WHERE is_active = TRUE;

-- ============================================================================
-- 2. sessions
-- Used by session.service.ts for:
--   - persistSession()              : record session on login
--   - revokeSessionByRefreshJti()   : invalidate session on refresh
--   - revokeSessionByJti()          : invalidate session on logout
--   - revokeAllSessionsByUser()     : forced logout / account lock
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  session_id     VARCHAR(64)   NOT NULL,
  user_id        VARCHAR(64)   NOT NULL,
  tenant_id      VARCHAR(16)   NOT NULL,
  jti            VARCHAR(128)  NOT NULL,
  refresh_jti    VARCHAR(128),
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ   NOT NULL,
  revoked_at     TIMESTAMPTZ,
  CONSTRAINT pk_sessions PRIMARY KEY (session_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_tenant
  ON public.sessions (user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_sessions_jti
  ON public.sessions (jti);

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_jti
  ON public.sessions (refresh_jti)
  WHERE refresh_jti IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON public.sessions (user_id, revoked_at)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON public.sessions (expires_at);

COMMIT;
