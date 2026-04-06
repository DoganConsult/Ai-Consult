-- Tenant migration: Enhanced platform tables
-- Adds 8 new tables for command palette, contextual AI, search indexing,
-- user preferences, WebSocket event queue, entity link metadata,
-- activity notifications, and inline edit history

DO $$
BEGIN

-- 1. Command palette history (fuzzy matching + frequency tracking)
CREATE TABLE IF NOT EXISTS command_palette_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  command_key VARCHAR(200) NOT NULL,
  command_label VARCHAR(500) NOT NULL,
  command_label_ar VARCHAR(500),
  command_category VARCHAR(50) NOT NULL DEFAULT 'navigation',
  usage_count INT NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cmd_palette_user ON command_palette_history(user_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_cmd_palette_key ON command_palette_history(command_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cmd_palette_user_key ON command_palette_history(user_id, command_key);

-- 2. Contextual AI suggestions (page-aware)
CREATE TABLE IF NOT EXISTS contextual_suggestions (
  suggestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_context VARCHAR(200) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  suggestion_type VARCHAR(50) NOT NULL DEFAULT 'action',
  title_en VARCHAR(500) NOT NULL,
  title_ar VARCHAR(500),
  description_en TEXT,
  description_ar TEXT,
  action_url VARCHAR(500),
  priority INT NOT NULL DEFAULT 5,
  conditions JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ctx_suggestions_page ON contextual_suggestions(page_context, active);
CREATE INDEX IF NOT EXISTS idx_ctx_suggestions_entity ON contextual_suggestions(entity_type, entity_id);

-- 3. Search index configuration (per-tenant tuning)
CREATE TABLE IF NOT EXISTS search_index_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  weight_title NUMERIC(3,2) NOT NULL DEFAULT 2.00,
  weight_description NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  boost_recent_days INT NOT NULL DEFAULT 30,
  boost_factor NUMERIC(3,2) NOT NULL DEFAULT 1.50,
  enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type)
);

-- 4. User preferences (UI state, command palette, theme)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(100) PRIMARY KEY,
  sidebar_collapsed BOOLEAN DEFAULT FALSE,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(5) DEFAULT 'ar',
  command_palette_shortcut VARCHAR(20) DEFAULT 'Cmd+K',
  recent_pages JSONB DEFAULT '[]',
  pinned_entities JSONB DEFAULT '[]',
  search_history JSONB DEFAULT '[]',
  notification_sound BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WebSocket event queue (persistent missed events)
CREATE TABLE IF NOT EXISTS websocket_event_queue (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ws_queue_user ON websocket_event_queue(target_user_id, delivered, created_at);
CREATE INDEX IF NOT EXISTS idx_ws_queue_cleanup ON websocket_event_queue(created_at) WHERE delivered = TRUE;

-- 6. Entity link metadata (extended relationship info)
CREATE TABLE IF NOT EXISTS entity_link_metadata (
  metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(link_id, key)
);
CREATE INDEX IF NOT EXISTS idx_link_metadata_link ON entity_link_metadata(link_id);

-- 7. Activity notifications (per-user feed items with read status)
CREATE TABLE IF NOT EXISTS activity_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_act_notif_user ON activity_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_act_notif_activity ON activity_notifications(activity_id);

-- 8. Inline edit history (field-level audit trail)
CREATE TABLE IF NOT EXISTS inline_edit_history (
  edit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_by VARCHAR(100) NOT NULL,
  validated BOOLEAN DEFAULT TRUE,
  validation_errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inline_edit_entity ON inline_edit_history(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inline_edit_user ON inline_edit_history(edited_by, created_at DESC);

END $$;
