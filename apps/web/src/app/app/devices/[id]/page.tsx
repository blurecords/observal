import Link from "next/link";
import { MetricsChart } from "@/components/charts/metrics-chart";
import { DeviceTestButton } from "@/components/app/device-test-button";
import { MikrotikLivePanel } from "@/components/devices/mikrotik-live-panel";
import { StatusBadge } from "@/components/app/status-badge";
import { WriteGate } from "@/components/app/role-context";
import { DEVICE_TYPES, isMikrotikProfile, PROFILE_LABELS } from "@/lib/av-catalog";
import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/helpers";
import { Pencil } from "lucide-react";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: device } = await supabase
    .from("av_devices")
    .select(
      "id, name, host, device_type, profile, brand, model, last_status, last_seen_at, critical, metadata, last_test_at, last_test_ok, last_test_message, rooms(name), venues(name)",
    )
    .eq("id", id)
    .single();

  if (!device) {
    return <p className="text-muted">Equipo no encontrado.</p>;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: metrics } = await supabase
    .from("metrics")
    .select("name, value_numeric, value_text, recorded_at")
    .eq("device_id", id)
    .gte("recorded_at", since)
    .order("recorded_at");

  const typeLabel =
    DEVICE_TYPES.find((t) => t.id === device.device_type)?.label ?? device.device_type;

  const numericMetrics = (metrics ?? []).filter((m) => m.value_numeric != null);
  const byName = numericMetrics.reduce<Record<string, Array<{ ts: string; value: number }>>>(
    (acc, m) => {
      if (!acc[m.name]) acc[m.name] = [];
      acc[m.name].push({
        ts: m.recorded_at,
        value: m.value_numeric as number,
      });
      return acc;
    },
    {},
  );

  const chartSeries = Object.entries(byName).slice(0, 2).map(([name, data], i) => ({
    name,
    data,
    color: i === 0 ? "#3b82f6" : "#22c55e",
  }));

  const mikrotik = isMikrotikProfile(device.profile as Parameters<typeof isMikrotikProfile>[0]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/app/devices" className="text-sm text-muted hover:text-white">
          ← Equipos AV
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h2 className="text-2xl font-bold">{device.name}</h2>
            <p className="text-muted mt-1">
              {[device.brand, device.model].filter(Boolean).join(" ") || typeLabel} ·{" "}
              <span className="font-mono text-sm">{device.host}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={device.last_status} />
            <WriteGate>
              <Link
                href={`/app/devices/${id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-card px-3 py-1.5 text-sm hover:bg-card"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Link>
            </WriteGate>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard label="Tipo" value={typeLabel} />
        <InfoCard label="Protocolo" value={PROFILE_LABELS[device.profile as keyof typeof PROFILE_LABELS] ?? device.profile} />
        <InfoCard
          label="Sala"
          value={relationName(device.rooms as { name: string } | { name: string }[] | null) ?? "—"}
        />
        <InfoCard
          label="Última lectura"
          value={
            device.last_seen_at
              ? new Date(device.last_seen_at).toLocaleString("es-ES")
              : "—"
          }
        />
      </div>

      <DeviceTestButton
        deviceId={device.id}
        lastTestAt={device.last_test_at}
        lastTestOk={device.last_test_ok}
        lastTestMessage={device.last_test_message}
      />

      {mikrotik ? (
        <MikrotikLivePanel deviceId={device.id} />
      ) : (
        <>
          <div className="rounded-xl border border-card bg-card p-5">
            <h3 className="font-semibold mb-4">Métricas — últimas 24 h</h3>
            <MetricsChart series={chartSeries} height={300} />
          </div>

          <div className="rounded-xl border border-card overflow-hidden">
            <div className="px-5 py-3 border-b border-card font-semibold text-sm">
              Lecturas recientes
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0a0f1a] text-muted sticky top-0">
                  <tr>
                    <th className="px-5 py-2 text-left">Métrica</th>
                    <th className="px-5 py-2 text-left">Valor</th>
                    <th className="px-5 py-2 text-left">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {(metrics ?? []).slice(-20).reverse().map((m, i) => (
                    <tr key={i}>
                      <td className="px-5 py-2 font-mono text-xs">{m.name}</td>
                      <td className="px-5 py-2">
                        {m.value_numeric ?? m.value_text ?? "—"}
                      </td>
                      <td className="px-5 py-2 text-muted text-xs">
                        {new Date(m.recorded_at).toLocaleString("es-ES")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-card bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium mt-1 text-sm">{value}</p>
    </div>
  );
}
