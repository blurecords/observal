-- Sprint 9: audit log, SLA reporting settings

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

CREATE POLICY audit_log_select ON audit_log FOR SELECT
  USING (organization_id = auth_organization_id());

CREATE POLICY audit_log_insert ON audit_log FOR INSERT
  WITH CHECK (
    organization_id = auth_organization_id()
    AND user_id = auth.uid()
  );

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sla_report_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_target_pct INT NOT NULL DEFAULT 99
    CHECK (sla_target_pct BETWEEN 80 AND 100),
  ADD COLUMN IF NOT EXISTS sla_report_day INT NOT NULL DEFAULT 1
    CHECK (sla_report_day BETWEEN 1 AND 28);
