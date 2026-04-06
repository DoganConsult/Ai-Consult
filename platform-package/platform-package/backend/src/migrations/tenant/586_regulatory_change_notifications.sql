-- ============================================
-- Migration: Regulatory Change Notifications
-- Tenant-scoped table for tracking regulatory change notifications
-- ============================================

CREATE TABLE IF NOT EXISTS "${schema}".regulatory_change_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  change_id UUID NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  message_en TEXT NOT NULL,
  message_ar TEXT,
  action_required BOOLEAN DEFAULT true,
  action_url TEXT,
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_regulatory_change_notif_tenant FOREIGN KEY (tenant_id) REFERENCES "${schema}".tenants(tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_regulatory_change_notif_tenant ON "${schema}".regulatory_change_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_change_notif_change ON "${schema}".regulatory_change_notifications(tenant_id, change_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_change_notif_priority ON "${schema}".regulatory_change_notifications(tenant_id, priority, notified_at);
CREATE INDEX IF NOT EXISTS idx_regulatory_change_notif_acknowledged ON "${schema}".regulatory_change_notifications(tenant_id, acknowledged_at) WHERE acknowledged_at IS NULL;

COMMENT ON TABLE "${schema}".regulatory_change_notifications IS 'Stores tenant-specific notifications for regulatory changes affecting their sector/frameworks';
COMMENT ON COLUMN "${schema}".regulatory_change_notifications.notification_type IS 'Type: new_regulation, amendment, deadline, etc.';
COMMENT ON COLUMN "${schema}".regulatory_change_notifications.priority IS 'Priority level: critical, high, medium, low';
