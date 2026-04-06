-- Migration 367: Seed navigation items for admin monitoring pages
-- Adds 4 new admin pages to navigation_items and role_nav_sections

INSERT INTO navigation_items (label_key, icon, route, module_code, required_permission, lifecycle_phase, module_group, product_scope, sort_order) VALUES
  ('slaMonitoring.title', 'pi-clock', '/sla-monitoring', NULL, 'admin:read', 'operate', 'operations', 'agrc', 80),
  ('evidenceSchedules.title', 'pi-calendar', '/evidence-schedules', 'evidence', 'evidence:read', 'assure', 'evidence', 'agrc', 81),
  ('jobMonitor.title', 'pi-server', '/job-monitor', NULL, 'admin:manage', 'operate', 'operations', 'agrc', 82),
  ('platformConfig.title', 'pi-cog', '/platform-config', NULL, 'admin:manage', 'operate', 'operations', 'agrc', 83)
ON CONFLICT DO NOTHING;

-- Add to admin role nav sections
UPDATE role_nav_sections
SET routes = routes || ARRAY['/sla-monitoring', '/evidence-schedules', '/job-monitor', '/platform-config']
WHERE role_code = 'admin' AND section_label_key = 'nav.section.operations'
  AND NOT (routes @> ARRAY['/sla-monitoring']);
