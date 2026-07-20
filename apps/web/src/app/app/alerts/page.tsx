import { AlertsList } from "@/components/app/alerts-list";
import { createClient } from "@/lib/supabase/server";

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: alerts } = await supabase
    .from("alerts")
    .select(
      "id, title, message, severity, rule_key, triggered_at, resolved, acknowledged, av_devices(name)",
    )
    .order("triggered_at", { ascending: false })
    .limit(100);

  const openCount = alerts?.filter((a) => !a.resolved).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Alertas</h2>
        <p className="text-muted mt-1">
          {openCount} alerta{openCount !== 1 ? "s" : ""} abierta
          {openCount !== 1 ? "s" : ""} — sistemas AV monitorizados.
        </p>
      </div>

      <AlertsList alerts={alerts ?? []} />
    </div>
  );
}
