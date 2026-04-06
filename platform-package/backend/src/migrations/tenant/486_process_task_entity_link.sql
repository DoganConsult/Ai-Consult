ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS entity_id  VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_pt_entity
  ON process_tasks(entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pt_control_entity
  ON process_tasks(control_id, entity_type)
  WHERE control_id IS NOT NULL;
