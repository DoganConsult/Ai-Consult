-- Data integrity fixes: persistent indexes + control_id type consistency

-- Missing index on evidence_tasks.control_id (Issue #22)
CREATE INDEX IF NOT EXISTS idx_evidence_tasks_control_id
  ON evidence_tasks (control_id);

CREATE INDEX IF NOT EXISTS idx_evidence_tasks_workspace_status
  ON evidence_tasks (workspace_id, status);

-- Missing index on process_tasks breached/escalation queries
CREATE INDEX IF NOT EXISTS idx_process_tasks_sla_check
  ON process_tasks (status, due_date, breached_at)
  WHERE status NOT IN ('completed', 'cancelled', 'auto_closed');

-- Missing index on agent_cycle_memory for retrieval
-- is_active column may not exist on older schemas; create index conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'agent_cycle_memory'
               AND column_name = 'is_active') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_agent_cycle_memory_tenant_agent
      ON agent_cycle_memory (tenant_id, agent_id, created_at DESC)
      WHERE is_active = TRUE';
  ELSE
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_agent_cycle_memory_tenant_agent
      ON agent_cycle_memory (tenant_id, agent_id, created_at DESC)';
  END IF;
END $$;

-- Normalize control_id to VARCHAR(128) across tables that have it (Issue #7)
-- Use safe ALTER that only runs if column is shorter
DO $$
BEGIN
  -- controls table
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'controls'
               AND column_name = 'control_id'
               AND character_maximum_length < 128) THEN
    ALTER TABLE controls ALTER COLUMN control_id TYPE VARCHAR(128);
  END IF;

  -- evidence_tasks table
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'evidence_tasks'
               AND column_name = 'control_id'
               AND character_maximum_length < 128) THEN
    ALTER TABLE evidence_tasks ALTER COLUMN control_id TYPE VARCHAR(128);
  END IF;

  -- evidence_schedules table
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'evidence_schedules'
               AND column_name = 'control_id'
               AND character_maximum_length < 128) THEN
    ALTER TABLE evidence_schedules ALTER COLUMN control_id TYPE VARCHAR(128);
  END IF;

  -- control_test_results table (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = current_schema()
               AND table_name = 'control_test_results') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema()
                 AND table_name = 'control_test_results'
                 AND column_name = 'control_id'
                 AND character_maximum_length < 128) THEN
      ALTER TABLE control_test_results ALTER COLUMN control_id TYPE VARCHAR(128);
    END IF;
  END IF;
END $$;
