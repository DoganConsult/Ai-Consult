-- Reasoning Persistence — Pillar 3: Explainability
-- Agent reasoning traces (one per run)
CREATE TABLE IF NOT EXISTS agent_reasoning_traces (
  run_id VARCHAR(100) PRIMARY KEY,
  agent_id VARCHAR(10) NOT NULL,
  total_steps INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  overall_confidence REAL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent reasoning steps (one per node execution)
CREATE TABLE IF NOT EXISTS agent_reasoning_steps (
  run_id VARCHAR(100) NOT NULL,
  step_index INTEGER NOT NULL,
  node_id VARCHAR(50) NOT NULL,
  reasoning TEXT,
  tools_used JSONB DEFAULT '[]',
  input_summary TEXT,
  output_summary TEXT,
  confidence REAL,
  duration_ms INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (run_id, step_index)
);

CREATE INDEX IF NOT EXISTS idx_reasoning_traces_agent ON agent_reasoning_traces (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_steps_run ON agent_reasoning_steps (run_id);
