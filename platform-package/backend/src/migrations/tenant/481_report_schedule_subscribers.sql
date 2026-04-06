-- Add subscribers column to report_schedules for auto-notify on scheduled report completion
ALTER TABLE report_schedules ADD COLUMN IF NOT EXISTS subscribers JSONB DEFAULT '[]';
