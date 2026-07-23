"use client";

import { MetricsChart } from "@/components/charts/metrics-chart";
import {
  formatBps,
  formatBytes,
  formatUptime,
  type RouterLiveSnapshot,
} from "@/lib/router-metrics";
import { Activity, Cpu, HardDrive, Network, RefreshCw, Thermometer } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface MikrotikLivePanelProps {
  deviceId: string;
  lastTestOk?: boolean | null;
  lastTestMessage?: string | null;
  lastTestAt?: string | null;
}

export function MikrotikLivePanel({
  deviceId,
  lastTestOk,
  lastTestMessage,
  lastTestAt,
}: MikrotikLivePanelProps) {
  const [snapshot, setSnapshot] = useState<RouterLiveSnapshot | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const resp = await fetch(`/api/devices/${deviceId}/live-metrics`, {
        cache: "no-store",
      });
      if (!resp.ok) {
        throw new Error("No se pudieron cargar las métricas");
      }
      const data = await resp.json();
      setSnapshot({
        updatedAt: data.updatedAt,
        system: data.system ?? {},
        interfaces: data.interfaces ?? [],
        trafficHistory: data.trafficHistory ?? [],
      });
      setLastSeenAt(data.lastSeenAt ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchSnapshot();
    const timer = window.setInterval(fetchSnapshot, 10_000);
    return () => window.clearInterval(timer);
  }, [fetchSnapshot]);

  const system = snapshot?.system ?? {};
  const interfaces = snapshot?.interfaces ?? [];
  const upInterfaces = interfaces.filter((iface) => iface.up).length;

  const chartSeries = (snapshot?.trafficHistory ?? []).map((series, index) => ({
    name: `${series.name} ↓`,
    data: series.data,
    color: ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"][index % 4],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            Monitor MikroTik en vivo
          </h3>
          <p className="text-xs text-muted mt-1">
            Actualización automática cada 10 s
            {snapshot?.updatedAt
              ? ` · última métrica ${new Date(snapshot.updatedAt).toLocaleTimeString("es-ES")}`
              : ""}
            {lastSeenAt
              ? ` · collector ${new Date(lastSeenAt).toLocaleTimeString("es-ES")}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchSnapshot();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-card px-3 py-1.5 text-sm hover:bg-card"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!error && !loading && !snapshot?.updatedAt && (
        <div className="rounded-xl border border-card bg-card p-6 text-sm text-muted space-y-3">
          <p>Esperando la primera lectura del collector.</p>
          {lastTestAt && (
            <p className={lastTestOk ? "text-green-400" : "text-red-400"}>
              Última prueba: {lastTestOk ? "OK" : "Fallida"}
              {lastTestMessage ? ` — ${lastTestMessage}` : ""}
            </p>
          )}
          <ul className="list-disc pl-5 space-y-1">
            <li>Actualiza el collector en la Pi (<code className="text-xs">mikrotik.py</code> + reinicio).</li>
            <li>En MikroTik: activa <strong>www-ssl</strong> (puerto 443) y usuario con grupo <strong>read</strong>.</li>
            <li>En Observal → Editar: vuelve a guardar usuario y contraseña RouterOS.</li>
            <li>
              <code className="text-xs">CREDENTIALS_ENCRYPTION_KEY</code> debe estar en Vercel y en Supabase Edge
              Functions.
            </li>
            <li>Pulsa <strong>Probar ahora</strong> y revisa <code className="text-xs">journalctl -u observal-collector -f</code> en la Pi.</li>
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Cpu}
          label="CPU"
          value={system.cpuLoad != null ? `${Math.round(system.cpuLoad)}%` : "—"}
          tone={gaugeTone(system.cpuLoad, 70, 90)}
        />
        <StatCard
          icon={HardDrive}
          label="Memoria"
          value={
            system.memoryUsedPct != null ? `${system.memoryUsedPct.toFixed(1)}%` : "—"
          }
          sub={
            system.memoryFreeBytes != null && system.memoryTotalBytes != null
              ? `${formatBytes(system.memoryFreeBytes)} libres / ${formatBytes(system.memoryTotalBytes)}`
              : undefined
          }
          tone={gaugeTone(system.memoryUsedPct, 75, 90)}
        />
        <StatCard
          icon={Network}
          label="Interfaces"
          value={`${upInterfaces}/${interfaces.length} up`}
          sub={
            system.ipAddressesCount != null
              ? `${system.ipAddressesCount} IPs · ${system.routesCount ?? 0} rutas · ${system.dhcpLeasesCount ?? 0} leases DHCP`
              : undefined
          }
        />
        <StatCard
          icon={Thermometer}
          label="Sistema"
          value={formatUptime(system.uptimeSec)}
          sub={[system.identity, system.boardName, system.version].filter(Boolean).join(" · ") || undefined}
        />
      </div>

      <div className="rounded-xl border border-card bg-card p-5">
        <h4 className="font-medium mb-4">Tráfico de interfaces (última hora)</h4>
        <MetricsChart series={chartSeries} height={260} unit="bps" />
      </div>

      <div className="rounded-xl border border-card overflow-hidden">
        <div className="px-5 py-3 border-b border-card font-medium text-sm flex items-center justify-between">
          <span>Interfaces</span>
          <span className="text-muted font-normal">{interfaces.length} detectadas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0f1a] text-muted">
              <tr>
                <th className="px-5 py-2 text-left">Interfaz</th>
                <th className="px-5 py-2 text-left">Estado</th>
                <th className="px-5 py-2 text-left">Tipo</th>
                <th className="px-5 py-2 text-right">↓ Tráfico</th>
                <th className="px-5 py-2 text-right">↑ Tráfico</th>
                <th className="px-5 py-2 text-right">↓ Bytes</th>
                <th className="px-5 py-2 text-right">↑ Bytes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {interfaces.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted">
                    Sin interfaces todavía
                  </td>
                </tr>
              ) : (
                interfaces.map((iface) => (
                  <tr key={iface.name}>
                    <td className="px-5 py-2 font-mono text-xs">{iface.name}</td>
                    <td className="px-5 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                          iface.up
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {iface.up ? "UP" : "DOWN"}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-muted">{iface.type || "—"}</td>
                    <td className="px-5 py-2 text-right font-mono text-xs">
                      {formatBps(iface.rxBps)}
                    </td>
                    <td className="px-5 py-2 text-right font-mono text-xs">
                      {formatBps(iface.txBps)}
                    </td>
                    <td className="px-5 py-2 text-right font-mono text-xs text-muted">
                      {formatBytes(iface.rxBytes)}
                    </td>
                    <td className="px-5 py-2 text-right font-mono text-xs text-muted">
                      {formatBytes(iface.txBytes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function gaugeTone(value: number | undefined, warn: number, crit: number) {
  if (value == null) return "text-muted";
  if (value >= crit) return "text-red-400";
  if (value >= warn) return "text-yellow-400";
  return "text-green-400";
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "text-white",
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-card bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-2 leading-relaxed">{sub}</p>}
    </div>
  );
}
