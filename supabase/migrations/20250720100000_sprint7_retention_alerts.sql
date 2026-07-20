-- Sprint 7: metrics retention, new alert rules

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS metrics_retention_days INT NOT NULL DEFAULT 90
    CHECK (metrics_retention_days >= 7 AND metrics_retention_days <= 365);

INSERT INTO alert_rules (organization_id, rule_key, enabled, severity)
SELECT o.id, r.rule_key, true, r.severity
FROM organizations o
CROSS JOIN (
  VALUES
    ('matrix_offline', 'warning'),
    ('projector_availability_error', 'warning')
) AS r(rule_key, severity)
ON CONFLICT (organization_id, rule_key) DO NOTHING;

CREATE OR REPLACE FUNCTION seed_alert_rules_for_org()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO alert_rules (organization_id, rule_key, enabled, severity)
  VALUES
    (NEW.id, 'device_offline', true, 'warning'),
    (NEW.id, 'critical_device_offline', true, 'critical'),
    (NEW.id, 'projector_lamp_hours', true, 'warning'),
    (NEW.id, 'collector_offline', true, 'critical'),
    (NEW.id, 'matrix_offline', true, 'warning'),
    (NEW.id, 'projector_availability_error', true, 'warning');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
