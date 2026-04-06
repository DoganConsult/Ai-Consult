-- AGRC-OS Master Migration 022
-- Add department_id column to public.users
-- Links users to tenant-schema departments for Foundation admin
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS department_id UUID;

CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department_id) WHERE department_id IS NOT NULL;
