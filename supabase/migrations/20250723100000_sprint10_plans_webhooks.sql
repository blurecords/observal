-- Sprint 10: plan tiers, webhook alerts

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_min_severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (webhook_min_severity IN ('info', 'warning', 'critical'));

COMMENT ON COLUMN organizations.plan IS 'starter | pro | enterprise — enforced in app layer';
COMMENT ON COLUMN organizations.webhook_url IS 'Slack incoming webhook or generic HTTPS endpoint';
