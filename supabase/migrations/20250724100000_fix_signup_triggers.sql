-- Fix: "Database error saving new user" on Google OAuth signup
-- Root cause: seed_alert_rules_for_org runs without auth context and RLS blocks inserts.

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
