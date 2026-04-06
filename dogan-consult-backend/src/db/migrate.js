import pool from './pool.js';

const migrations = [
  `CREATE TABLE IF NOT EXISTS consultations (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    phone VARCHAR(50),
    service_area VARCHAR(100),
    message TEXT,
    lang VARCHAR(5) DEFAULT 'ar',
    status VARCHAR(30) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    lang VARCHAR(5) DEFAULT 'ar',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS content_embeddings (
    id SERIAL PRIMARY KEY,
    content_key VARCHAR(255) UNIQUE NOT NULL,
    content_text TEXT NOT NULL,
    lang VARCHAR(5) DEFAULT 'en',
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS email_log (
    id SERIAL PRIMARY KEY,
    direction VARCHAR(10) NOT NULL DEFAULT 'sent',
    mail_to TEXT,
    mail_from VARCHAR(255),
    subject VARCHAR(500),
    graph_message_id VARCHAR(500),
    status VARCHAR(30) DEFAULT 'sent',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS agent_actions (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    graph_message_id VARCHAR(500),
    from_email VARCHAR(255),
    to_email VARCHAR(255),
    subject VARCHAR(500),
    original_body TEXT,
    draft_body TEXT,
    final_body TEXT,
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(30) DEFAULT 'pending',
    agent_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS auto_reply_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    match_type VARCHAR(30) DEFAULT 'all',
    match_pattern TEXT,
    exclude_pattern TEXT,
    reply_subject_template TEXT,
    reply_body_template TEXT NOT NULL,
    lang VARCHAR(5) DEFAULT 'ar',
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    lang VARCHAR(5) DEFAULT 'en',
    message_count INT DEFAULT 1,
    last_user_message TEXT,
    last_agent_reply TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status)`,
  `CREATE INDEX IF NOT EXISTS idx_consultations_created ON consultations(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_content_embeddings_key ON content_embeddings(content_key)`,
  `CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_email_log_direction ON email_log(direction)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_actions_status ON agent_actions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_actions_created ON agent_actions(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_actions_msgid ON agent_actions(graph_message_id)`,
  `CREATE INDEX IF NOT EXISTS idx_auto_reply_active ON auto_reply_rules(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_sessions_sid ON chat_sessions(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC)`,
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  `CREATE TABLE IF NOT EXISTS lab_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    tagline_ar VARCHAR(500),
    tagline_en VARCHAR(500),
    description_ar TEXT,
    description_en TEXT,
    features_json JSONB DEFAULT '{}',
    pricing_json JSONB DEFAULT '{}',
    use_cases_json JSONB DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'live',
    hero_image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lab_products_slug ON lab_products(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_lab_products_active ON lab_products(is_active, sort_order)`,
];

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const sql of migrations) {
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('Migrations completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
// This empty export prevents double-import issues
