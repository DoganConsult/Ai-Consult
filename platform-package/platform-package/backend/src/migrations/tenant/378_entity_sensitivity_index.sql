-- Feature 20: Entity Sensitivity Columns + DPIA Indexes

ALTER TABLE risks ADD COLUMN IF NOT EXISTS sensitivity_level VARCHAR(20) DEFAULT 'normal'
  CHECK (sensitivity_level IN ('normal', 'sensitive', 'high', 'restricted'));

ALTER TABLE ucf_controls ADD COLUMN IF NOT EXISTS data_classification VARCHAR(20) DEFAULT 'internal'
  CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted'));

CREATE INDEX IF NOT EXISTS idx_risks_sensitivity
  ON risks(sensitivity_level) WHERE sensitivity_level IN ('high', 'restricted');

CREATE INDEX IF NOT EXISTS idx_controls_classification
  ON ucf_controls(data_classification) WHERE data_classification = 'restricted';
