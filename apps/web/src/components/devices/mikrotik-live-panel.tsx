"use client";

import { MetricsChart } from "@/components/charts/metrics-chart";
import {
  formatBps,
  formatBytes,
  formatNumber,
  formatPercent,
  formatUptime,
  type RouterLiveSnapshot,
} from "@/lib/router-metrics";
import {
  Activity,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Network,
  RefreshCw,
  Wifi,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const REFRESH_MS = 30_000;

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
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const inFlightRef = useRef(false);

  const fetchSnapshot = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
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
        txTrafficHistory: data.txTrafficHistory ?? [],
        cpuHistory: data.cpuHistory ?? [],
        memoryHistory: data.memoryHistory ?? [],
      });
      setLastSeenAt(data.lastSeenAt ?? null);
      setLastFetchAt(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchSnapshot();
    const timer = window.setInterval(fetchSnapshot, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [fetchSnapshot]);

  const system = snapshot?.system ?? {};
  const interfaces = snapshot?.interfaces ?? [];
  const upInterfaces = interfaces.filter((iface) => iface.up).length;
  const totalRxBps = interfaces.reduce((sum, iface) => sum + (iface.rxBps ?? 0), 0);
  const totalTxBps = interfaces.reduce((sum, iface) => sum + (iface.txBps ?? 0), 0);

  const trafficChartSeries = useMemo(
    () =>
      (snapshot?.trafficHistory ?? []).map((series, index) => ({
        name: `${series.name} ↓`,
        data: series.data,
        color: ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444"][index % 6],
      })),
    [snapshot?.trafficHistory],
  );

  const txTrafficChartSeries = useMemo(
    () =>
      (snapshot?.txTrafficHistory ?? []).map((series, index) => ({
        name: `${series.name} ↑`,
        data: series.data,
        color: ["#f97316", "#84cc16", "#eab308", "#ec4899", "#14b8a6", "#6366f1"][index % 6],
      })),
    [snapshot?.txTrafficHistory],
  );

  const isLive =
    snapshot?.updatedAt != null &&
    Date.now() - new Date(snapshot.updatedAt).getTime() < 45_000;

  const systemRows = [
    { label: "Identidad", value: system.identity },
    { label: "Modelo / placa", value: system.boardName },
    { label: "RouterOS", value: system.version },
    { label: "Plataforma", value: system.platform },
    { label: "Arquitectura", value: system.architecture },
    { label: "CPUs", value: system.cpuCount != null ? String(system.cpuCount) : undefined },
    { label: "Uptime", value: formatUptime(system.uptimeSec) },
    { label: "Temperatura CPU", value: system.temperature != null ? `${system.temperature.toFixed(1)} °C` : undefined },
    { label: "Voltaje", value: system.healthVoltage != null ? `${system.healthVoltage.toFixed(1)} V` : undefined },
    { label: "Conexiones activas", value: formatNumber(system.connectionsCount) },
    { label: "Direcciones IP", value: formatNumber(system.ipAddressesCount) },
    { label: "Rutas", value: formatNumber(system.routesCount) },
    { label: "Leases DHCP", value: formatNumber(system.dhcpLeasesCount) },
    { label: "Memoria libre", value: formatBytes(system.memoryFreeBytes) },
    { label: "Memoria total", value: formatBytes(system.memoryTotalBytes) },
    { label: "Disco libre", value: formatBytes(system.diskFreeBytes) },
    { label: "Disco total", value: formatBytes(system.diskTotalBytes) },
  ].filter((row) => row.value && row.value !== "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            Monitor MikroTik en vivo
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                isLive
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}
              />
              {isLive ? "En vivo" : "Esperando datos"}
            </span>
          </h3>
          <p className="text-xs text-muted mt-1">
            Actualización cada 30 s
            {snapshot?.updatedAt
              ? ` · última métrica ${new Date(snapshot.updatedAt).toLocaleTimeString("es-ES")}`
              : ""}
            {lastFetchAt
              ? ` · UI ${new Date(lastFetchAt).toLocaleTimeString("es-ES")}`
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
          <p>Esperando la primera lectura del collector (poll cada 30 s).</p>
          {lastTestAt && (
            <p className={lastTestOk ? "text-green-400" : "text-red-400"}>
              Última prueba: {lastTestOk ? "OK" : "Fallida"}
              {lastTestMessage ? ` — ${lastTestMessage}` : ""}
            </p>
          )}
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Actualiza el collector en la Pi y reinicia:{" "}
              <code className="text-xs">sudo systemctl restart observal-collector</code>
            </li>
            <li>
              Asegura poll 30 s en Supabase:{" "}
              <code className="text-xs">poll_interval_sec: 30</code> en collector_configs
            </li>
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <GaugeCard
          icon={Cpu}
          label="CPU"
          value={formatPercent(system.cpuLoad, 0)}
          percent={system.cpuLoad}
          tone={gaugeTone(system.cpuLoad, 70, 90)}
        />
        <GaugeCard
          icon={HardDrive}
          label="Memoria"
          value={formatPercent(system.memoryUsedPct)}
          percent={system.memoryUsedPct}
          sub={
            system.memoryFreeBytes != null && system.memoryTotalBytes != null
              ? `${formatBytes(system.memoryFreeBytes)} libres`
              : undefined
          }
          tone={gaugeTone(system.memoryUsedPct, 75, 90)}
        />
        <GaugeCard
          icon={Database}
          label="Disco"
          value={formatPercent(system.diskUsedPct)}
          percent={system.diskUsedPct}
          sub={
            system.diskFreeBytes != null
              ? `${formatBytes(system.diskFreeBytes)} libres`
              : undefined
          }
          tone={gaugeTone(system.diskUsedPct, 80, 95)}
        />
        <StatCard
          icon={Network}
          label="Tráfico agregado"
          value={`↓ ${formatBps(totalRxBps)}`}
          sub={`↑ ${formatBps(totalTxBps)} · ${upInterfaces}/${interfaces.length} interfaces up`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="CPU (15 min)" unit="%" series={[{ name: "CPU", data: snapshot?.cpuHistory ?? [], color: "#3b82f6" }]} />
        <ChartCard
          title="Memoria (15 min)"
          unit="%"
          series={[{ name: "Memoria", data: snapshot?.memoryHistory ?? [], color: "#22c55e" }]}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-card bg-card p-5">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-blue-400" />
            Tráfico entrante (15 min)
          </h4>
          <MetricsChart series={trafficChartSeries} height={240} unit="bps" />
        </div>
        <div className="rounded-xl border border-card bg-card p-5">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-400" />
            Tráfico saliente (15 min)
          </h4>
          <MetricsChart series={txTrafficChartSeries} height={240} unit="bps" />
        </div>
      </div>

      <div className="rounded-xl border border-card bg-card p-5">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-purple-400" />
          Propiedades del sistema
        </h4>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {systemRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-[var(--card-border)] bg-[#0a0f1a] px-4 py-3"
            >
              <p className="text-[11px] uppercase tracking-wide text-muted">{row.label}</p>
              <p className="mt-1 text-sm font-medium break-all">{row.value}</p>
            </div>
          ))}
        </div>
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
                <th className="px-4 py-2 text-left">Interfaz</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">↓ bps</th>
                <th className="px-4 py-2 text-right">↑ bps</th>
                <th className="px-4 py-2 text-right">↓ bytes</th>
                <th className="px-4 py-2 text-right">↑ bytes</th>
                <th className="px-4 py-2 text-right">Paquetes</th>
                <th className="px-4 py-2 text-right">Drops</th>
                <th className="px-4 py-2 text-right">Errores</th>
                <th className="px-4 py-2 text-left">MAC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {interfaces.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-8 text-center text-muted">
                    Sin interfaces todavía
                  </td>
                </tr>
              ) : (
                interfaces.map((iface) => (
                  <tr key={iface.name} className="hover:bg-[#0a0f1a]/50">
                    <td className="px-4 py-2">
                      <div className="font-mono text-xs">{iface.name}</div>
                      {iface.comment && (
                        <div className="text-[11px] text-muted mt-0.5">{iface.comment}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2 text-muted">{iface.type || "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-blue-300">
                      {formatBps(iface.rxBps)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-orange-300">
                      {formatBps(iface.txBps)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-muted">
                      {formatBytes(iface.rxBytes)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-muted">
                      {formatBytes(iface.txBytes)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-muted">
                      ↓{formatNumber(iface.rxPackets)} / ↑{formatNumber(iface.txPackets)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      <span className={(iface.rxDrops ?? 0) > 0 ? "text-yellow-400" : "text-muted"}>
                        {formatNumber(iface.rxDrops)} / {formatNumber(iface.txDrops)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs">
                      <span className={(iface.rxErrors ?? 0) > 0 ? "text-red-400" : "text-muted"}>
                        {formatNumber(iface.rxErrors)} / {formatNumber(iface.txErrors)}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-muted">
                      {iface.mac || "—"}
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

function GaugeCard({
  icon: Icon,
  label,
  value,
  percent,
  sub,
  tone = "text-white",
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  percent?: number;
  sub?: string;
  tone?: string;
}) {
  const barPct = percent != null ? Math.min(Math.max(percent, 0), 100) : 0;
  const barColor =
    percent == null
      ? "bg-muted"
      : percent >= 90
        ? "bg-red-500"
        : percent >= 70
          ? "bg-yellow-500"
          : "bg-green-500";

  return (
    <div className="rounded-xl border border-card bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      <div className="mt-3 h-1.5 rounded-full bg-[#1a2236] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${barPct}%` }} />
      </div>
      {sub && <p className="text-xs text-muted mt-2 leading-relaxed">{sub}</p>}
    </div>
  );
}

function ChartCard({
  title,
  unit,
  series,
}: {
  title: string;
  unit: string;
  series: Array<{ name: string; data: Array<{ ts: string; value: number }>; color?: string }>;
}) {
  return (
    <div className="rounded-xl border border-card bg-card p-5">
      <h4 className="font-medium mb-4">{title}</h4>
      <MetricsChart series={series} height={220} unit={unit} />
    </div>
  );
}
