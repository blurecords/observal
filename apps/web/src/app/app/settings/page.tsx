import { createClient } from "@/lib/supabase/server";

type OrgRow = { name: string; timezone: string };

function getOrg(
  rel: OrgRow | OrgRow[] | null | undefined,
): OrgRow | undefined {
  if (!rel) return undefined;
  if (Array.isArray(rel)) return rel[0];
  return rel;
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, organizations(name, timezone)")
    .single();

  const org = getOrg(profile?.organizations as OrgRow | OrgRow[] | null);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Ajustes</h2>
        <p className="text-muted mt-1">Configuración de tu organización.</p>
      </div>

      <div className="rounded-xl border border-card bg-card p-6 space-y-4">
        <div>
          <label className="text-sm text-muted">Organización</label>
          <p className="font-medium mt-1">{org?.name ?? "—"}</p>
        </div>
        <div>
          <label className="text-sm text-muted">Zona horaria</label>
          <p className="font-medium mt-1">{org?.timezone ?? "Europe/Madrid"}</p>
        </div>
        <div>
          <label className="text-sm text-muted">Tu rol</label>
          <p className="font-medium mt-1">{profile?.role ?? "owner"}</p>
        </div>
      </div>

      <p className="text-sm text-muted">
        Configuración avanzada de horarios de apertura y notificaciones en Fase 9.
      </p>
    </div>
  );
}
