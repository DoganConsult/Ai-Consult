-- Migration 418: Functional roles enhancements
-- Adds module mappings, permission inheritance chains, and action visibility controls.

ALTER TABLE IF EXISTS functional_roles ADD COLUMN IF NOT EXISTS module_mappings JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS functional_roles ADD COLUMN IF NOT EXISTS permission_inheritance JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS functional_roles ADD COLUMN IF NOT EXISTS action_visibility JSONB DEFAULT '[]';
