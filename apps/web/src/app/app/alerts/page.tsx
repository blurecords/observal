import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/helpers";

const severityColors: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, title, message, severity, triggered_at, resolved, av_devices(name)")
    .order("triggered_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Alertas</h2>
        <p className="text-muted mt-1">
          Eventos y alarmas del equipamiento AV del museo.
        </p>
      </div>

      {!alerts?.length ? (
        <div className="rounded-xl border border-dashed border-card p-12 text-center">
          <p className="text-muted">Sin alertas. Todo en orden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-card bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium">{a.title}</p>
                {a.message && (
                  <p className="text-sm text-muted mt-1">{a.message}</p>
                )}
                <p className="text-xs text-muted mt-2">
                  {relationName(a.av_devices as { name: string } | { name: string }[] | null) ?? "Sistema"} ·{" "}
                  {new Date(a.triggered_at).toLocaleString("es-ES")}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${severityColors[a.severity]}`}
              >
                {a.severity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
