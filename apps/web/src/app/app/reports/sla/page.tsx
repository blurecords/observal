import Link from "next/link";
import {
  computeOverallUptime,
  computeUptimeFromMetrics,
  computeUptimePct,
  lastCompleteMonthRange,
  type DeviceUptimeRow,
} from "@/lib/sla";
import { relationName } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";

export default async function SlaReportPage() {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, sla_target_pct, sla_report_enabled")
    .single();

  const { start, end, label } = lastCompleteMonthRange();

  const { data: devices } = await supabase
    .from("av_devices")
    .select("id, name, rooms(name)")
    .eq("enabled", true)
    .order("name");

  const rows: DeviceUptimeRow[] = [];

  for (const device of devices ?? []) {
    const { data: metrics } = await supabase
      .from("metrics")
      .select("name, value_bool, value_text")
      .eq("device_id", device.id)
      .in("name", ["device.reachable", "snmp.reachable", "tcp.port_open", "projector.power"])
      .gte("recorded_at", start.toISOString())
      .lte("recorded_at", end.toISOString());

    const { samples, onlineSamples } = computeUptimeFromMetrics(metrics ?? []);

    rows.push({
      deviceId: device.id,
      deviceName: device.name,
      roomName:
        relationName(
          device.rooms as { name: string } | { name: string }[] | null,
        ) ?? null,
      samples,
      onlineSamples,
      uptimePct: computeUptimePct(onlineSamples, samples),
    });
  }

  const overall = computeOverallUptime(rows);
  const target = org?.sla_target_pct ?? 99;
  const met = overall !== null && overall >= target;

  const { count: alertCount } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .gte("triggered_at", start.toISOString())
    .lte("triggered_at", end.toISOString());

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/app/reports" className="text-sm text-muted hover:text-white">
          ← Informes
        </Link>
        <h2 className="text-2xl font-bold mt-2">Informe SLA</h2>
        <p className="text-muted mt-1">{label} · {org?.name}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-card bg-card p-5">
          <p className="text-sm text-muted">Uptime global</p>
          <p
            className={`text-3xl font-bold mt-2 ${met ? "text-green-400" : overall !== null ? "text-yellow-400" : "text-muted"}`}
          >
            {overall !== null ? `${overall}%` : "—"}
          </p>
          <p className="text-xs text-muted mt-1">Objetivo: {target}%</p>
        </div>
        <div className="rounded-xl border border-card bg-card p-5">
          <p className="text-sm text-muted">Equipos</p>
          <p className="text-3xl font-bold mt-2">{devices?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-card bg-card p-5">
          <p className="text-sm text-muted">Alertas en periodo</p>
          <p className="text-3xl font-bold mt-2">{alertCount ?? 0}</p>
        </div>
      </div>

      {!org?.sla_report_enabled && (
        <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
          Activa el envío mensual por email en Ajustes → Notificaciones.
        </p>
      )}

      <div className="rounded-xl border border-card overflow-hidden">
        <div className="px-5 py-4 border-b border-card font-semibold text-sm">
          Uptime por equipo
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#0a0f1a] text-muted text-left">
            <tr>
              <th className="px-5 py-2">Equipo</th>
              <th className="px-5 py-2 hidden sm:table-cell">Sala</th>
              <th className="px-5 py-2">Uptime</th>
              <th className="px-5 py-2 hidden md:table-cell">Muestras</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {rows.map((r) => (
              <tr key={r.deviceId}>
                <td className="px-5 py-3 font-medium">{r.deviceName}</td>
                <td className="px-5 py-3 hidden sm:table-cell text-muted">
                  {r.roomName ?? "—"}
                </td>
                <td className="px-5 py-3">
                  {r.uptimePct !== null ? (
                    <span
                      className={
                        r.uptimePct >= target ? "text-green-400" : "text-yellow-400"
                      }
                    >
                      {r.uptimePct}%
                    </span>
                  ) : (
                    <span className="text-muted">Sin datos</span>
                  )}
                </td>
                <td className="px-5 py-3 hidden md:table-cell text-muted">
                  {r.samples}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
