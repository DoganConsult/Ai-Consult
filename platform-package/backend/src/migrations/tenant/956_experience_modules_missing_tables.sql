-- ============================================================
-- Migration 956: Experience Modules — Missing Tables
-- Modules: Dashboard (4), Inbox (6), Notification (5), Portals (6),
--          Training (5), Journey (7)
-- Tables: 33 total
-- ============================================================

-- ═══ DASHBOARD (MP-24) ═══
CREATE TABLE IF NOT EXISTS dashboards (
  dashboard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, layout JSONB DEFAULT '{}',
  owner_user_id VARCHAR(64), is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  widget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(dashboard_id) ON DELETE CASCADE,
  widget_type VARCHAR(50), title VARCHAR(500), config JSONB DEFAULT '{}',
  data_source VARCHAR(200), position JSONB DEFAULT '{}', refresh_seconds INT DEFAULT 300,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);
CREATE TABLE IF NOT EXISTS dashboard_zones (
  zone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(dashboard_id) ON DELETE CASCADE,
  zone_code VARCHAR(100), zone_name VARCHAR(200),
  layout_config JSONB DEFAULT '{}', sort_order INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS dashboard_publish_history (
  publish_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(dashboard_id),
  published_by VARCHAR(64), snapshot JSONB DEFAULT '{}',
  version VARCHAR(20), published_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ INBOX (MP-29) ═══
CREATE TABLE IF NOT EXISTS inbox_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID, sender_type VARCHAR(30) DEFAULT 'system' CHECK (sender_type IN ('system','user','agent','external')),
  sender_id VARCHAR(64), subject VARCHAR(500), body TEXT,
  priority VARCHAR(20) DEFAULT 'normal', message_type VARCHAR(50) DEFAULT 'notification',
  source_module VARCHAR(100), source_entity_type VARCHAR(100), source_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS inbox_threads (
  thread_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(500) NOT NULL, participant_ids JSONB DEFAULT '[]',
  message_count INT DEFAULT 0, last_message_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','archived','closed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS inbox_read_receipts (
  receipt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES inbox_messages(message_id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL, read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);
CREATE TABLE IF NOT EXISTS inbox_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  body_template TEXT, variables JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS inbox_broadcasts (
  broadcast_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, body TEXT NOT NULL,
  audience JSONB DEFAULT '{}', sent_at TIMESTAMPTZ,
  sent_by VARCHAR(64), recipient_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS inbox_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL UNIQUE,
  notification_channels JSONB DEFAULT '{"in_app":true,"email":true}',
  mute_until TIMESTAMPTZ, digest_frequency VARCHAR(30) DEFAULT 'immediate',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ NOTIFICATION (MP-35) ═══
CREATE TABLE IF NOT EXISTS notification_channels (
  channel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_code VARCHAR(100) UNIQUE, channel_name VARCHAR(200) NOT NULL,
  channel_type VARCHAR(30) CHECK (channel_type IN ('in_app','email','sms','webhook','push','slack','teams')),
  config JSONB DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS notification_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  subject_template TEXT, body_template TEXT,
  channel_id UUID REFERENCES notification_channels(channel_id),
  variables JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL, event_type VARCHAR(100) NOT NULL,
  channel_id UUID REFERENCES notification_channels(channel_id),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_type, channel_id)
);
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(template_id),
  channel_id UUID REFERENCES notification_channels(channel_id),
  recipient_user_id VARCHAR(64), recipient_address VARCHAR(500),
  status VARCHAR(30) DEFAULT 'sent' CHECK (status IN ('queued','sent','delivered','failed','bounced')),
  sent_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notification_digests (
  digest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  digest_type VARCHAR(30) DEFAULT 'daily' CHECK (digest_type IN ('hourly','daily','weekly')),
  items JSONB NOT NULL DEFAULT '[]', item_count INT DEFAULT 0,
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ PORTALS (MP-37) ═══
CREATE TABLE IF NOT EXISTS portal_configs (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_code VARCHAR(100) UNIQUE, portal_name VARCHAR(500) NOT NULL,
  portal_type VARCHAR(50) DEFAULT 'vendor' CHECK (portal_type IN ('vendor','customer','regulator','partner','public')),
  theme JSONB DEFAULT '{}', features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);
CREATE TABLE IF NOT EXISTS portal_users (
  portal_user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID REFERENCES portal_configs(config_id),
  email VARCHAR(255) NOT NULL, name VARCHAR(200),
  role VARCHAR(50) DEFAULT 'viewer', status VARCHAR(30) DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS portal_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id UUID REFERENCES portal_users(portal_user_id),
  token_hash VARCHAR(500), ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS portal_pages (
  page_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID REFERENCES portal_configs(config_id),
  page_code VARCHAR(100), title VARCHAR(500) NOT NULL,
  content JSONB DEFAULT '{}', sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS portal_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id UUID REFERENCES portal_users(portal_user_id),
  token_type VARCHAR(30) CHECK (token_type IN ('invite','reset','verify','api')),
  token_hash VARCHAR(500) NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS portal_invitations (
  invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID REFERENCES portal_configs(config_id),
  email VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'viewer',
  invited_by VARCHAR(64), token_hash VARCHAR(500),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ TRAINING (MP-43) ═══
CREATE TABLE IF NOT EXISTS training_courses (
  course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, category VARCHAR(100),
  duration_hours NUMERIC(5,1), format VARCHAR(30) DEFAULT 'online'
    CHECK (format IN ('online','classroom','blended','self_paced','webinar')),
  is_mandatory BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);
CREATE TABLE IF NOT EXISTS training_topics (
  topic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES training_courses(course_id),
  topic_name VARCHAR(500) NOT NULL, sort_order INT DEFAULT 0,
  content TEXT, duration_minutes INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS training_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES training_courses(course_id),
  target_type VARCHAR(50) CHECK (target_type IN ('role','department','team','individual','all')),
  target_id VARCHAR(200), frequency VARCHAR(30) DEFAULT 'annual',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS training_quiz_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES training_courses(course_id),
  user_id VARCHAR(64) NOT NULL, score NUMERIC(5,2), max_score NUMERIC(5,2) DEFAULT 100,
  passed BOOLEAN, attempt_number INT DEFAULT 1,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS training_reminders (
  reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES training_requirements(requirement_id),
  user_id VARCHAR(64) NOT NULL, due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ, reminder_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ JOURNEY (MP-31) ═══
CREATE TABLE IF NOT EXISTS journey_roadmaps (
  roadmap_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, description TEXT,
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('draft','active','completed','archived')),
  owner_user_id VARCHAR(64), target_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);
CREATE TABLE IF NOT EXISTS journey_phases (
  phase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES journey_roadmaps(roadmap_id) ON DELETE CASCADE,
  phase_name VARCHAR(500) NOT NULL, sort_order INT DEFAULT 0,
  start_date DATE, end_date DATE,
  status VARCHAR(30) DEFAULT 'planned',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS journey_milestones (
  milestone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES journey_phases(phase_id),
  title VARCHAR(500) NOT NULL, target_date DATE,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','achieved','missed','deferred')),
  achieved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS journey_capability_assessments (
  assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES journey_roadmaps(roadmap_id),
  capability VARCHAR(200) NOT NULL, current_level INT DEFAULT 0,
  target_level INT DEFAULT 3, gap INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS journey_maturity_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES journey_roadmaps(roadmap_id),
  dimension VARCHAR(100), score NUMERIC(5,2), target NUMERIC(5,2),
  assessment_date DATE DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS journey_gap_items (
  gap_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES journey_capability_assessments(assessment_id),
  description TEXT NOT NULL, priority VARCHAR(20) DEFAULT 'medium',
  remediation TEXT, status VARCHAR(30) DEFAULT 'open',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS journey_recommendations (
  rec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES journey_roadmaps(roadmap_id),
  title VARCHAR(500) NOT NULL, description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', source VARCHAR(50) DEFAULT 'ai',
  status VARCHAR(30) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS journey_benchmark_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES journey_roadmaps(roadmap_id),
  snapshot_date DATE DEFAULT CURRENT_DATE, scores JSONB DEFAULT '{}',
  peer_comparison JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS journey_certification_tracks (
  track_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES journey_roadmaps(roadmap_id),
  certification_name VARCHAR(500) NOT NULL, issuing_body VARCHAR(200),
  target_date DATE, achieved_date DATE,
  status VARCHAR(30) DEFAULT 'planned' CHECK (status IN ('planned','in_progress','achieved','expired','renewed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS journey_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID, entity_type VARCHAR(50), entity_id UUID,
  action VARCHAR(100) NOT NULL, actor_id VARCHAR(64),
  details JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboards_active ON dashboards (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread ON inbox_messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_status ON inbox_threads (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_channels_active ON notification_channels (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_delivery_status ON notification_delivery_log (status);
CREATE INDEX IF NOT EXISTS idx_portal_configs_active ON portal_configs (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_portal_users_portal ON portal_users (portal_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_active ON training_courses (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journey_roadmaps_status ON journey_roadmaps (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journey_phases_roadmap ON journey_phases (roadmap_id);
