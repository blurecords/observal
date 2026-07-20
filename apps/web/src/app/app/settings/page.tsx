import { AlertRulesSettings, NotificationSettings } from "@/components/app/settings-forms";
import { OpeningHoursSettings } from "@/components/app/opening-hours-form";
import { OrganizationSettings } from "@/components/app/org-settings-form";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .single();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Ajustes</h2>
        <p className="text-muted mt-1">Configuración de tu organización y alertas.</p>
      </div>

      <OrganizationSettings />

      <div className="rounded-xl border border-card bg-card p-6">
        <label className="text-sm text-muted">Tu rol</label>
        <p className="font-medium mt-1">{profile?.role ?? "owner"}</p>
      </div>

      <NotificationSettings />
      <OpeningHoursSettings />
      <AlertRulesSettings />
    </div>
  );
}
