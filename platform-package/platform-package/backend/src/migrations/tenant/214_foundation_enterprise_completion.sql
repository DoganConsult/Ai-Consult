-- ============================================
-- Migration 214: Foundation Enterprise Completion
-- Adds DPO/CISO regulatory tracking per NCA ECC 1-4 and PDPL
-- Adds missing columns for enterprise-grade foundation
-- ============================================

-- ── Users: DPO & CISO regulatory tracking ──
-- NCA ECC 1-4: CISO must be full-time Saudi national
-- PDPL: DPO appointment mandatory for qualifying entities
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_dpo BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ciso BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(3);
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification_notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(30) DEFAULT 'full_time';
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reports_to VARCHAR(64);

-- Index for quick DPO/CISO lookups
CREATE INDEX IF NOT EXISTS idx_users_dpo ON users(is_dpo) WHERE is_dpo = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_ciso ON users(is_ciso) WHERE is_ciso = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to) WHERE reports_to IS NOT NULL;
