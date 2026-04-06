-- Feature 15: AI Model Risk → Enterprise Risk Register linking

CREATE INDEX IF NOT EXISTS idx_entity_links_ai_model
  ON entity_links(source_type, source_id) WHERE source_type = 'ai_model';

ALTER TABLE risks ADD COLUMN IF NOT EXISTS risk_category VARCHAR(60);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS entity_links JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(risk_category) WHERE risk_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_entity_links_model ON risks((entity_links->>'modelId')) WHERE risk_category = 'ai_model';
