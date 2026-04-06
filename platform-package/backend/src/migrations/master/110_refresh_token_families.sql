-- Migration: 110_refresh_token_families
-- DAuth — refresh token family tracking for rotation detection + replay prevention
-- Referenced by: backend/src/platform/dauth/session/refresh.service.ts
-- Spec: Patch 3 §2.5.3

CREATE TABLE IF NOT EXISTS public.refresh_token_families (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id     VARCHAR(255) NOT NULL UNIQUE,
  user_id       VARCHAR(255) NOT NULL,
  tenant_id     VARCHAR(255) NOT NULL,
  current_jti   VARCHAR(255),
  rotation_count INT NOT NULL DEFAULT 0,
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rtf_user_id ON public.refresh_token_families(user_id);
CREATE INDEX IF NOT EXISTS idx_rtf_family_id ON public.refresh_token_families(family_id);
CREATE INDEX IF NOT EXISTS idx_rtf_tenant_status ON public.refresh_token_families(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rtf_expires ON public.refresh_token_families(expires_at) WHERE status = 'active';

COMMENT ON TABLE public.refresh_token_families IS 'DAuth: tracks refresh token rotation families for replay attack detection';
