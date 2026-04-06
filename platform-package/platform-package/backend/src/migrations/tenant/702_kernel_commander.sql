-- Kernel Commander: autonomy control + priority directives for agent_runtime_config
ALTER TABLE agent_runtime_config ADD COLUMN IF NOT EXISTS autonomy_level VARCHAR(30) DEFAULT 'hybrid';
ALTER TABLE agent_runtime_config ADD COLUMN IF NOT EXISTS priority_directive JSONB DEFAULT NULL;

-- Token tracking for agent_runs (may already exist from migration 700, safe with IF NOT EXISTS)
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;
