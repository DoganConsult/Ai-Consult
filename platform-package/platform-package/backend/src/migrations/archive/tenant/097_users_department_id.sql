-- AGRC-OS Tenant Migration 097
-- Add department_id column to tenant-schema users table (if it exists)
-- Mirrors master migration 022 for tenant-schema users
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID;
  END IF;
END $$;
