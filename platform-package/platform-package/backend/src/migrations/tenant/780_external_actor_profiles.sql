-- Phase 5: External Actor Profiles
-- GAP-08: No structured external user profile model

CREATE TABLE IF NOT EXISTS external_stakeholder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES actor_registry(actor_id),
  stakeholder_type TEXT NOT NULL CHECK (stakeholder_type IN ('vendor','regulator','consultant','auditor','partner','customer')),
  organization_name TEXT NOT NULL,
  organization_name_ar TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  engagement_scope JSONB NOT NULL DEFAULT '{}',
  data_access_boundary JSONB NOT NULL DEFAULT '{"modules":[],"read_only":true}',
  nda_status TEXT NOT NULL DEFAULT 'none' CHECK (nda_status IN ('none','pending','signed','expired','revoked')),
  nda_signed_at TIMESTAMPTZ,
  nda_expires_at TIMESTAMPTZ,
  portal_type TEXT CHECK (portal_type IN ('vendor_portal','regulator_portal','consultant_center','custom')),
  interaction_history JSONB NOT NULL DEFAULT '[]',
  max_data_classification TEXT NOT NULL DEFAULT 'internal' CHECK (max_data_classification IN ('public','internal','confidential','restricted')),
  allowed_modules TEXT[] NOT NULL DEFAULT '{}',
  allowed_actions TEXT[] NOT NULL DEFAULT ARRAY['read'],
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ext_stakeholder_type ON external_stakeholder_profiles (stakeholder_type);
CREATE INDEX IF NOT EXISTS idx_ext_stakeholder_actor ON external_stakeholder_profiles (actor_id);
