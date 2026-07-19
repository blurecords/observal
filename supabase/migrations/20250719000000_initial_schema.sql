-- Observal AV — initial schema (museum + multi-protocol AV monitoring)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Organizations & profiles ───────────────────────────────────────────────

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Venue hierarchy (museum) ───────────────────────────────────────────────

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor TEXT,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  UNIQUE (venue_id, day_of_week)
);

-- ─── Factory inventory & collectors ─────────────────────────────────────────

CREATE TABLE devices_factory (
  hardware_id UUID PRIMARY KEY,
  pairing_code_hash TEXT NOT NULL UNIQUE,
  device_secret TEXT NOT NULL,
  batch_id TEXT,
  status TEXT NOT NULL DEFAULT 'manufactured'
    CHECK (status IN ('manufactured', 'shipped', 'claimed', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hardware_id UUID NOT NULL UNIQUE REFERENCES devices_factory(hardware_id),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'online_unclaimed'
    CHECK (status IN ('online_unclaimed', 'claimed', 'active', 'offline', 'revoked')),
  ingest_token_hash TEXT,
  firmware_version TEXT,
  local_ip INET,
  config_version INT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collector_configs (
  collector_id UUID PRIMARY KEY REFERENCES collectors(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AV devices ─────────────────────────────────────────────────────────────

CREATE TABLE av_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  collector_id UUID REFERENCES collectors(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  host INET NOT NULL,
  profile TEXT NOT NULL DEFAULT 'ping',
  credentials_encrypted TEXT,
  critical BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_status TEXT NOT NULL DEFAULT 'unknown',
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Metrics & heartbeats ───────────────────────────────────────────────────

CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES collectors(id) ON DELETE SET NULL,
  device_id UUID REFERENCES av_devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value_numeric DOUBLE PRECISION,
  value_text TEXT,
  value_bool BOOLEAN,
  status TEXT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX metrics_device_time_idx ON metrics (device_id, recorded_at DESC);
CREATE INDEX metrics_org_time_idx ON metrics (organization_id, recorded_at DESC);

CREATE TABLE collector_heartbeats (
  id BIGSERIAL PRIMARY KEY,
  collector_id UUID NOT NULL REFERENCES collectors(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  local_ip INET,
  devices_polled INT NOT NULL DEFAULT 0,
  errors_count INT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX collector_heartbeats_collector_idx
  ON collector_heartbeats (collector_id, recorded_at DESC);

-- ─── Alerts ─────────────────────────────────────────────────────────────────

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  device_id UUID REFERENCES av_devices(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES collectors(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  rule_key TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX alerts_org_active_idx
  ON alerts (organization_id, resolved, triggered_at DESC);

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER collectors_updated_at BEFORE UPDATE ON collectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER av_devices_updated_at BEFORE UPDATE ON av_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create org + profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    lower(replace(gen_random_uuid()::text, '-', ''))
  )
  RETURNING id INTO new_org_id;

  INSERT INTO profiles (id, organization_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE av_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY org_select ON organizations FOR SELECT
  USING (id = auth_organization_id());

CREATE POLICY org_update ON organizations FOR UPDATE
  USING (id = auth_organization_id());

CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (organization_id = auth_organization_id());

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY venues_all ON venues FOR ALL
  USING (organization_id = auth_organization_id())
  WITH CHECK (organization_id = auth_organization_id());

CREATE POLICY rooms_all ON rooms FOR ALL
  USING (organization_id = auth_organization_id())
  WITH CHECK (organization_id = auth_organization_id());

CREATE POLICY opening_hours_all ON opening_hours FOR ALL
  USING (organization_id = auth_organization_id())
  WITH CHECK (organization_id = auth_organization_id());

CREATE POLICY collectors_select ON collectors FOR SELECT
  USING (organization_id = auth_organization_id());

CREATE POLICY collectors_update ON collectors FOR UPDATE
  USING (organization_id = auth_organization_id());

CREATE POLICY collector_configs_select ON collector_configs FOR SELECT
  USING (organization_id = auth_organization_id());

CREATE POLICY av_devices_all ON av_devices FOR ALL
  USING (organization_id = auth_organization_id())
  WITH CHECK (organization_id = auth_organization_id());

CREATE POLICY metrics_select ON metrics FOR SELECT
  USING (organization_id = auth_organization_id());

CREATE POLICY heartbeats_select ON collector_heartbeats FOR SELECT
  USING (organization_id = auth_organization_id());

CREATE POLICY alerts_all ON alerts FOR ALL
  USING (organization_id = auth_organization_id())
  WITH CHECK (organization_id = auth_organization_id());

-- devices_factory: no public access (service role only)
