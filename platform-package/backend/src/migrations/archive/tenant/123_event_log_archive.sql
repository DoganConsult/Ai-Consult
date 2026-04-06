-- F12: Event Log Archive + performance indexes
CREATE TABLE IF NOT EXISTS agrc_event_log_archive (LIKE agrc_event_log INCLUDING ALL);
CREATE INDEX IF NOT EXISTS idx_event_log_created ON agrc_event_log(created_at);
CREATE INDEX IF NOT EXISTS idx_event_log_archive_created ON agrc_event_log_archive(created_at);
