-- Catch-up: aplicar en Supabase SQL Editor si solo tienes el schema inicial.
-- Proyecto: kcaiuodwgthpsxoqlccg
-- Ejecutar TODO este archivo de una vez (Run).

-- ─── Sprint 3: alertas ───────────────────────────────────────────────────────

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

DROP POLICY IF EXISTS alert_rules_all ON alert_rules;
DROP POLICY IF EXISTS alert_rules_select ON alert_rules;
DROP POLICY IF EXISTS alert_rules_write ON alert_rules;

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

CREATE INDEX IF NOT EXISTS alerts_open_rule_device_idx
  ON alerts (organization_id, device_id, rule_key)
  WHERE resolved = false;

-- Reglas por defecto para orgs existentes
INSERT INTO alert_rules (organization_id, rule_key, enabled, severity)
SELECT o.id, r.rule_key, true, r.severity
FROM organizations o
CROSS JOIN (
  VALUES
    ('device_offline', 'warning'),
    ('critical_device_offline', 'critical'),
    ('projector_lamp_hours', 'warning'),
    ('collector_offline', 'critical'),
    ('matrix_offline', 'warning'),
    ('projector_availability_error', 'warning')
) AS r(rule_key, severity)
ON CONFLICT (organization_id, rule_key) DO NOTHING;

-- ─── Sprint 7: retención ─────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS metrics_retention_days INT NOT NULL DEFAULT 90
    CHECK (metrics_retention_days >= 7 AND metrics_retention_days <= 365);

-- ─── Sprint 9: SLA + audit ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_org_time_idx
  ON audit_log (organization_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_select ON audit_log;
DROP POLICY IF EXISTS audit_log_insert ON audit_log;

CREATE POLICY audit_log_select ON audit_log FOR SELECT
  USING (organization_id = auth_organization_id());
CREATE POLICY audit_log_insert ON audit_log FOR INSERT
  WITH CHECK (organization_id = auth_organization_id() AND user_id = auth.uid());

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sla_report_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_target_pct INT NOT NULL DEFAULT 99
    CHECK (sla_target_pct BETWEEN 80 AND 100),
  ADD COLUMN IF NOT EXISTS sla_report_day INT NOT NULL DEFAULT 1
    CHECK (sla_report_day BETWEEN 1 AND 28);

-- ─── Sprint 10: planes + webhooks ────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_min_severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (webhook_min_severity IN ('info', 'warning', 'critical'));

-- ─── Otros ajustes menores ───────────────────────────────────────────────────

ALTER TABLE collectors ADD COLUMN IF NOT EXISTS pending_ingest_token TEXT;

ALTER TABLE av_devices
  ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_message TEXT,
  ADD COLUMN IF NOT EXISTS last_test_ok BOOLEAN,
  ADD COLUMN IF NOT EXISTS test_requested_at TIMESTAMPTZ;

-- ─── Triggers de registro (fix login Google) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.seed_alert_rules_for_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);

  INSERT INTO alert_rules (organization_id, rule_key, enabled, severity)
  VALUES
    (NEW.id, 'device_offline', true, 'warning'),
    (NEW.id, 'critical_device_offline', true, 'critical'),
    (NEW.id, 'projector_lamp_hours', true, 'warning'),
    (NEW.id, 'collector_offline', true, 'critical'),
    (NEW.id, 'matrix_offline', true, 'warning'),
    (NEW.id, 'projector_availability_error', true, 'warning')
  ON CONFLICT (organization_id, rule_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_seed_alert_rules ON organizations;
CREATE TRIGGER organizations_seed_alert_rules
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.seed_alert_rules_for_org();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  invite RECORD;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'org_invites'
  ) THEN
    SELECT * INTO invite
    FROM org_invites
    WHERE lower(email) = lower(NEW.email)
      AND accepted_at IS NULL
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF invite IS NOT NULL THEN
    INSERT INTO profiles (id, organization_id, full_name, avatar_url, role)
    VALUES (
      NEW.id,
      invite.organization_id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'avatar_url',
      invite.role
    );
    UPDATE org_invites SET accepted_at = now() WHERE id = invite.id;
    RETURN NEW;
  END IF;

  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    lower(replace(gen_random_uuid()::text, '-', ''))
  )
  RETURNING id INTO new_org_id;

  INSERT INTO profiles (id, organization_id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'owner'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.email, SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Verificación ────────────────────────────────────────────────────────────
-- Debería devolver alert_rules:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_rules';
