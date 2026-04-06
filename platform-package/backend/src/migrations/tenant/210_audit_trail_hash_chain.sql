-- =====================================================
-- Migration 210: Audit trail hash chain for tamper detection
-- Adds entry_hash and previous_hash columns.
-- New entries are hashed by the application layer;
-- existing rows will have NULL hashes (pre-chain era).
-- =====================================================

ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS entry_hash VARCHAR(64);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entry_hash ON audit_trail (entry_hash);
