-- F09: Vendor Portal — external token-based access
CREATE TABLE IF NOT EXISTS vendor_portal_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  scope JSONB DEFAULT '["questionnaire:read","questionnaire:submit"]',
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vpt_hash ON vendor_portal_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_vpt_vendor ON vendor_portal_tokens(vendor_id);

CREATE TABLE IF NOT EXISTS vendor_questionnaire_submissions (
  submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  questionnaire_id UUID NOT NULL,
  token_id UUID REFERENCES vendor_portal_tokens(token_id),
  answers JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vqs_vendor ON vendor_questionnaire_submissions(vendor_id);
