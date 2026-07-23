-- FIX INMEDIATO: login Google — "relation org_invites does not exist"
-- Supabase Dashboard → SQL Editor → pegar TODO y Run

-- 1) Tabla org_invites (Sprint 8)
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('integrator', 'viewer')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS org_invites_email_idx ON org_invites (lower(email))
  WHERE accepted_at IS NULL;

ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

-- 2) Funciones RBAC (necesarias para políticas)
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_can_manage()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() IN ('owner', 'integrator')
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_is_owner()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() = 'owner'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS org_invites_select ON org_invites;
DROP POLICY IF EXISTS org_invites_insert ON org_invites;
DROP POLICY IF EXISTS org_invites_delete ON org_invites;

CREATE POLICY org_invites_select ON org_invites FOR SELECT
  USING (organization_id = auth_organization_id() AND auth_is_owner());
CREATE POLICY org_invites_insert ON org_invites FOR INSERT
  WITH CHECK (organization_id = auth_organization_id() AND auth_is_owner());
CREATE POLICY org_invites_delete ON org_invites FOR DELETE
  USING (organization_id = auth_organization_id() AND auth_is_owner());

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'integrator', 'viewer'));

-- 3) Trigger de registro (SECURITY DEFINER + bypass RLS)
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

  SELECT * INTO invite
  FROM org_invites
  WHERE lower(email) = lower(NEW.email)
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

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

-- 4) Seed alert_rules al crear org (si alert_rules existe)
CREATE OR REPLACE FUNCTION public.seed_alert_rules_for_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'alert_rules'
  ) THEN
    RETURN NEW;
  END IF;

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

-- Verificar:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('org_invites', 'alert_rules');
