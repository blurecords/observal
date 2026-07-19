import { CollectorActions, CollectorDetailHeader } from "@/components/app/collector-actions";
import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/helpers";

export default async function CollectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: collector } = await supabase
    .from("collectors")
    .select(
      "id, name, status, firmware_version, local_ip, last_seen_at, config_version, venues(name)",
    )
    .eq("id", id)
    .single();

  if (!collector) {
    return <p className="text-muted">Collector no encontrado.</p>;
  }

  const { count: deviceCount } = await supabase
    .from("av_devices")
    .select("id", { count: "exact", head: true })
    .eq("collector_id", id);

  const { data: heartbeats } = await supabase
    .from("collector_heartbeats")
    .select("devices_polled, errors_count, recorded_at")
    .eq("collector_id", id)
    .order("recorded_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 max-w-3xl">
      <CollectorDetailHeader
        name={collector.name ?? "Observal Collector"}
        status={collector.status}
        venueName={relationName(
          collector.venues as { name: string } | { name: string }[] | null,
        )}
        firmware={collector.firmware_version}
        lastSeen={collector.last_seen_at}
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Equipos asignados" value={String(deviceCount ?? 0)} />
        <StatCard label="Config versión" value={String(collector.config_version)} />
        <StatCard label="IP local" value={collector.local_ip ?? "—"} />
      </div>

      <div className="rounded-xl border border-card bg-card p-6">
        <h3 className="font-semibold mb-4">Seguridad</h3>
        <CollectorActions collectorId={collector.id} status={collector.status} />
      </div>

      <div className="rounded-xl border border-card bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-card font-semibold text-sm">
          Actividad reciente
        </div>
        <div className="divide-y divide-[var(--card-border)]">
          {(heartbeats ?? []).map((h, i) => (
            <div key={i} className="px-5 py-3 text-sm flex justify-between">
              <span className="text-muted">
                {new Date(h.recorded_at).toLocaleString("es-ES")}
              </span>
              <span>
                {h.devices_polled} equipos · {h.errors_count} errores
              </span>
            </div>
          ))}
          {!heartbeats?.length && (
            <p className="px-5 py-4 text-sm text-muted">Sin actividad registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-card bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold mt-1 font-mono text-sm">{value}</p>
    </div>
  );
}
