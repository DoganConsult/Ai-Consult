-- Migration 197 — User Last Login Tracking
-- Adds last_login_at column for login observability
-- Part of Auth + Tenant Observability R1

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
