-- 076: Seed evidence_schedules from controls (enables evidence-request-generator job)
-- evidence_schedules columns: schedule_id, control_id, cron_expression, reminder_text, assigned_to, enabled, last_reminded_at, created_at

INSERT INTO evidence_schedules (control_id, cron_expression, reminder_text, enabled)
SELECT c.control_id,
  CASE (ROW_NUMBER() OVER (ORDER BY c.control_id) % 4)
    WHEN 0 THEN '0 0 1 * *'    -- monthly
    WHEN 1 THEN '0 0 1 */3 *'  -- quarterly
    WHEN 2 THEN '0 0 * * 1'    -- weekly
    ELSE '0 0 1 * *'           -- monthly default
  END,
  'Scheduled evidence collection for: ' || COALESCE(c.title, c.control_id),
  true
FROM controls c
WHERE NOT EXISTS (
  SELECT 1 FROM evidence_schedules es WHERE es.control_id = c.control_id
);
