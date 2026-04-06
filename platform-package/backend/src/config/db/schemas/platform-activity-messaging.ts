import { logger } from '../../../platform/dos/observability/logger.service';
// ============================================
// Platform Schema — Activity, Messaging & UX
// Comments, activity feed/stream, entity links,
// notification preferences, search vectors,
// channels, messages, action items, command palette,
// contextual suggestions, search index config,
// user preferences, websocket queue, entity link
// metadata, activity notifications, inline edit history.
// ============================================

import { query } from '../query';

export async function createActivityMessagingTables(schema: string): Promise<void> {
  // === GRC Full Functionality Gap Tables ===

  // Comments (threaded, polymorphic entity reference)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".comments (
      comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      author_id VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      parent_comment_id UUID REFERENCES "${schema}".comments(comment_id) ON DELETE CASCADE,
      mentions TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_comments_entity ON "${schema}".comments(entity_type, entity_id);
  `);

  // Activity feed
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".activity_feed (
      activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(100) NOT NULL,
      action VARCHAR(50) NOT NULL,
      module VARCHAR(50) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      entity_title VARCHAR(500),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_activity_feed_time ON "${schema}".activity_feed(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON "${schema}".activity_feed(user_id, created_at DESC);
  `);

  // Entity links (cross-module relationships)
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".entity_links (
      link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(50) NOT NULL,
      source_id VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_id VARCHAR(100) NOT NULL,
      link_type VARCHAR(50) NOT NULL DEFAULT 'related',
      created_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source_type, source_id, target_type, target_id, link_type)
    );
    CREATE INDEX IF NOT EXISTS idx_entity_links_source ON "${schema}".entity_links(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_entity_links_target ON "${schema}".entity_links(target_type, target_id);
  `);

  // Notification preferences
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".notification_preferences (
      user_id VARCHAR(100) PRIMARY KEY,
      preferences JSONB DEFAULT '{"deadline_reminder":{"in_app":true,"email":true},"approval_request":{"in_app":true,"email":true},"comment_mention":{"in_app":true,"email":false},"assignment":{"in_app":true,"email":true},"critical_alert":{"in_app":true,"email":true},"activity_update":{"in_app":true,"email":false}}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Full-text search vectors on existing tables
  try {
    await query(`ALTER TABLE "${schema}".risks ADD COLUMN IF NOT EXISTS search_vector tsvector;`);
    await query(`ALTER TABLE "${schema}".policies ADD COLUMN IF NOT EXISTS search_vector tsvector;`);
    await query(`ALTER TABLE "${schema}".controls ADD COLUMN IF NOT EXISTS search_vector tsvector;`);
    await query(`ALTER TABLE "${schema}".incidents ADD COLUMN IF NOT EXISTS search_vector tsvector;`);
    await query(`ALTER TABLE "${schema}".vendors ADD COLUMN IF NOT EXISTS search_vector tsvector;`);
    await query(`ALTER TABLE "${schema}".evidence ADD COLUMN IF NOT EXISTS search_vector tsvector;`);
    await query(`CREATE INDEX IF NOT EXISTS idx_risks_search ON "${schema}".risks USING GIN(search_vector);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_policies_search ON "${schema}".policies USING GIN(search_vector);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_controls_search ON "${schema}".controls USING GIN(search_vector);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_incidents_search ON "${schema}".incidents USING GIN(search_vector);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_vendors_search ON "${schema}".vendors USING GIN(search_vector);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_evidence_search ON "${schema}".evidence USING GIN(search_vector);`);
  } catch (err) {
    logger.warn(`[DB] Could not add search vectors for schema ${schema}:`, err);
  }

  // === GRC Competitive Edge — New tenant tables ===

  // Activity stream
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".activity_stream (
      activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(64) NOT NULL,
      module VARCHAR(50) NOT NULL,
      action VARCHAR(20) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      summary TEXT,
      changes JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_activity_stream_entity ON "${schema}".activity_stream(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_stream_time ON "${schema}".activity_stream(created_at DESC);
  `);

  // Messaging channels and messages
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".channels (
      channel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) DEFAULT 'predefined',
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "${schema}".messages (
      message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id UUID,
      sender_id VARCHAR(64) NOT NULL,
      recipient_id VARCHAR(64),
      content TEXT NOT NULL,
      entity_attachments JSONB DEFAULT '[]',
      mentions TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON "${schema}".messages(channel_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_dm ON "${schema}".messages(sender_id, recipient_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS "${schema}".message_read_status (
      user_id VARCHAR(64) NOT NULL,
      channel_id UUID NOT NULL,
      last_read_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, channel_id)
    );
  `);

  // Action items
  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".action_items (
      item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      source_type VARCHAR(50) NOT NULL,
      source_id VARCHAR(100) NOT NULL,
      assigned_to VARCHAR(64) NOT NULL,
      deadline DATE,
      reminder_schedule JSONB DEFAULT '[1, 3, 7]',
      status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','in_progress','completed','overdue','deleted')),
      escalated_to VARCHAR(64),
      priority INT NOT NULL DEFAULT 5,
      type VARCHAR(50) DEFAULT 'task',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // Add columns that may be missing if table was created by migration 065
  await query(`
    ALTER TABLE "${schema}".action_items ADD COLUMN IF NOT EXISTS item_id UUID;
    ALTER TABLE "${schema}".action_items ADD COLUMN IF NOT EXISTS deadline DATE;
    ALTER TABLE "${schema}".action_items ADD COLUMN IF NOT EXISTS reminder_schedule JSONB DEFAULT '[1, 3, 7]';
    ALTER TABLE "${schema}".action_items ADD COLUMN IF NOT EXISTS escalated_to VARCHAR(64);
    ALTER TABLE "${schema}".action_items ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 5;
    ALTER TABLE "${schema}".action_items ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'task';
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_action_items_user ON "${schema}".action_items(assigned_to, status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_action_items_deadline ON "${schema}".action_items(deadline)`);

  // === Enhanced Platform Tables (v3) ===

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".command_palette_history (
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cmd_palette_user_key ON "${schema}".command_palette_history(user_id, command_key);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".contextual_suggestions (
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
    CREATE INDEX IF NOT EXISTS idx_ctx_suggestions_page ON "${schema}".contextual_suggestions(page_context, active);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".search_index_config (
      config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL UNIQUE,
      weight_title NUMERIC(3,2) NOT NULL DEFAULT 2.00,
      weight_description NUMERIC(3,2) NOT NULL DEFAULT 1.00,
      boost_recent_days INT NOT NULL DEFAULT 30,
      boost_factor NUMERIC(3,2) NOT NULL DEFAULT 1.50,
      enabled BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".user_preferences (
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
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".websocket_event_queue (
      event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      target_user_id VARCHAR(100) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      event_data JSONB NOT NULL DEFAULT '{}',
      delivered BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      delivered_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_ws_queue_user ON "${schema}".websocket_event_queue(target_user_id, delivered, created_at);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".entity_link_metadata (
      metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      link_id UUID NOT NULL,
      key VARCHAR(100) NOT NULL,
      value TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(link_id, key)
    );
    CREATE INDEX IF NOT EXISTS idx_link_metadata_link ON "${schema}".entity_link_metadata(link_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".activity_notifications (
      notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      activity_id UUID NOT NULL,
      user_id VARCHAR(100) NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      dismissed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_act_notif_user ON "${schema}".activity_notifications(user_id, read, created_at DESC);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS "${schema}".inline_edit_history (
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
    CREATE INDEX IF NOT EXISTS idx_inline_edit_entity ON "${schema}".inline_edit_history(entity_type, entity_id, created_at DESC);
  `);
}
