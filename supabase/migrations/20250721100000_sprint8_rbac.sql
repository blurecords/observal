-- Sprint 8: RBAC roles, team invites, role-based RLS

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'integrator', 'viewer'));

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

-- Join org via pending invite instead of creating a solo org
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  invite RECORD;
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations: only owners edit
DROP POLICY IF EXISTS org_update ON organizations;
CREATE POLICY org_update ON organizations FOR UPDATE
  USING (id = auth_organization_id() AND auth_is_owner());

-- Profiles: owners manage team roles; users edit own profile fields
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR (organization_id = auth_organization_id() AND auth_is_owner())
  );

-- Invites: owners only
CREATE POLICY org_invites_select ON org_invites FOR SELECT
  USING (organization_id = auth_organization_id() AND auth_is_owner());

CREATE POLICY org_invites_insert ON org_invites FOR INSERT
  WITH CHECK (organization_id = auth_organization_id() AND auth_is_owner());

CREATE POLICY org_invites_delete ON org_invites FOR DELETE
  USING (organization_id = auth_organization_id() AND auth_is_owner());

-- Venues / rooms / opening hours: managers write
DROP POLICY IF EXISTS venues_all ON venues;
CREATE POLICY venues_select ON venues FOR SELECT
  USING (organization_id = auth_organization_id());
CREATE POLICY venues_write ON venues FOR ALL
  USING (organization_id = auth_organization_id() AND auth_can_manage())
  WITH CHECK (organization_id = auth_organization_id() AND auth_can_manage());

DROP POLICY IF EXISTS rooms_all ON rooms;
CREATE POLICY rooms_select ON rooms FOR SELECT
  USING (organization_id = auth_organization_id());
CREATE POLICY rooms_write ON rooms FOR ALL
  USING (organization_id = auth_organization_id() AND auth_can_manage())
  WITH CHECK (organization_id = auth_organization_id() AND auth_can_manage());

DROP POLICY IF EXISTS opening_hours_all ON opening_hours;
CREATE POLICY opening_hours_select ON opening_hours FOR SELECT
  USING (organization_id = auth_organization_id());
CREATE POLICY opening_hours_write ON opening_hours FOR ALL
  USING (organization_id = auth_organization_id() AND auth_can_manage())
  WITH CHECK (organization_id = auth_organization_id() AND auth_can_manage());

-- Collectors: all read; managers update (claim handled via edge function)
DROP POLICY IF EXISTS collectors_update ON collectors;
CREATE POLICY collectors_update ON collectors FOR UPDATE
  USING (organization_id = auth_organization_id() AND auth_can_manage());

-- Devices: managers write
DROP POLICY IF EXISTS av_devices_all ON av_devices;
CREATE POLICY av_devices_select ON av_devices FOR SELECT
  USING (organization_id = auth_organization_id());
CREATE POLICY av_devices_write ON av_devices FOR ALL
  USING (organization_id = auth_organization_id() AND auth_can_manage())
  WITH CHECK (organization_id = auth_organization_id() AND auth_can_manage());

-- Alerts: managers ack/resolve
DROP POLICY IF EXISTS alerts_all ON alerts;
CREATE POLICY alerts_select ON alerts FOR SELECT
  USING (organization_id = auth_organization_id());
CREATE POLICY alerts_write ON alerts FOR ALL
  USING (organization_id = auth_organization_id() AND auth_can_manage())
  WITH CHECK (organization_id = auth_organization_id() AND auth_can_manage());

-- Alert rules: owners + integrators
DROP POLICY IF EXISTS alert_rules_all ON alert_rules;
CREATE POLICY alert_rules_select ON alert_rules FOR SELECT
  USING (organization_id = auth_organization_id());
CREATE POLICY alert_rules_write ON alert_rules FOR ALL
  USING (organization_id = auth_organization_id() AND auth_can_manage())
  WITH CHECK (organization_id = auth_organization_id() AND auth_can_manage());

-- Public invite lookup by token (no org data leaked)
CREATE OR REPLACE FUNCTION get_invite_public(p_token TEXT)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'email', email,
    'role', role,
    'accepted_at', accepted_at,
    'expires_at', expires_at
  )
  FROM org_invites
  WHERE token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_invite_public(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION accept_org_invite(p_token TEXT, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv org_invites%ROWTYPE;
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
  SELECT * INTO inv FROM org_invites WHERE token = p_token LIMIT 1;

  IF inv IS NULL THEN
    RETURN json_build_object('error', 'Invitación no encontrada');
  END IF;
  IF inv.accepted_at IS NOT NULL THEN
    RETURN json_build_object('error', 'Invitación ya utilizada');
  END IF;
  IF inv.expires_at < now() THEN
    RETURN json_build_object('error', 'Invitación expirada');
  END IF;
  IF lower(user_email) <> lower(inv.email) THEN
    RETURN json_build_object('error', 'Email no coincide con la invitación');
  END IF;

  UPDATE profiles
  SET organization_id = inv.organization_id, role = inv.role
  WHERE id = p_user_id;

  UPDATE org_invites SET accepted_at = now() WHERE id = inv.id;

  RETURN json_build_object('ok', true, 'organization_id', inv.organization_id);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_org_invite(TEXT, UUID) TO authenticated;
