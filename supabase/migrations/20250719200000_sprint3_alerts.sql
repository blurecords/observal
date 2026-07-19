-- Sprint 3: alert rules, notifications, opening hours context

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS notification_email TEXT,
  ADD COLUMN IF NOT EXISTS alerts_email_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lamp_hours_warning INT NOT NULL DEFAULT 1800,
  ADD COLUMN IF NOT EXISTS pre_opening_alert_minutes INT NOT NULL DEFAULT 30;

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'critical')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rule_key)
);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_rules_all ON alert_rules FOR ALL
  USING (organization_id = auth_organization_id())
  WITH CHECK (organization_id = auth_organization_id());

CREATE TABLE IF NOT EXISTS alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  recipient TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alert_id, channel)
);

-- No RLS on alert_notifications (service role only)

CREATE INDEX IF NOT EXISTS alerts_open_rule_device_idx
  ON alerts (organization_id, device_id, rule_key)
  WHERE resolved = false;

-- Seed default rules for existing organizations
INSERT INTO alert_rules (organization_id, rule_key, enabled, severity)
SELECT o.id, r.rule_key, true, r.severity
FROM organizations o
CROSS JOIN (
  VALUES
    ('device_offline', 'warning'),
    ('critical_device_offline', 'critical'),
    ('projector_lamp_hours', 'warning'),
    ('collector_offline', 'critical')
) AS r(rule_key, severity)
ON CONFLICT (organization_id, rule_key) DO NOTHING;

-- Auto-seed rules for new organizations
CREATE OR REPLACE FUNCTION seed_alert_rules_for_org()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO alert_rules (organization_id, rule_key, enabled, severity)
  VALUES
    (NEW.id, 'device_offline', true, 'warning'),
    (NEW.id, 'critical_device_offline', true, 'critical'),
    (NEW.id, 'projector_lamp_hours', true, 'warning'),
    (NEW.id, 'collector_offline', true, 'critical');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_seed_alert_rules ON organizations;
CREATE TRIGGER organizations_seed_alert_rules
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_alert_rules_for_org();
