import { AlertRulesSettings, NotificationSettings } from "@/components/app/settings-forms";
import { OpeningHoursSettings } from "@/components/app/opening-hours-form";
import { OrganizationSettings } from "@/components/app/org-settings-form";
import { TeamSettings } from "@/components/app/team-settings";
import { ROLE_LABELS, parseRole, canManageOrgSettings, canManageTeam } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, organization_id")
    .single();

  const role = parseRole(profile?.role);

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("organization_id", profile?.organization_id ?? "")
    .order("created_at");

  const { data: invites } = canManageTeam(role)
    ? await supabase
        .from("org_invites")
        .select("id, email, role, expires_at, token")
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Ajustes</h2>
        <p className="text-muted mt-1">Configuración de tu organización y alertas.</p>
      </div>

      <div className="rounded-xl border border-card bg-card p-6">
        <label className="text-sm text-muted">Tu rol</label>
        <p className="font-medium mt-1">{ROLE_LABELS[role]}</p>
      </div>

      {canManageOrgSettings(role) && <OrganizationSettings />}
      {canManageOrgSettings(role) && <NotificationSettings />}
      {canManageTeam(role) && user && (
        <TeamSettings
          members={members ?? []}
          invites={invites ?? []}
          currentUserId={user.id}
        />
      )}
      {role !== "viewer" && <OpeningHoursSettings />}
      {role !== "viewer" && <AlertRulesSettings />}
    </div>
  );
}
