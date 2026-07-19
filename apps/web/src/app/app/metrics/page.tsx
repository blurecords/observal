"use client";

import { MetricsChart, type MetricPoint } from "@/components/charts/metrics-chart";
import { DEVICE_TYPES } from "@/lib/av-catalog";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Range = "24h" | "7d" | "30d";

export default function MetricsExplorerPage() {
  const supabase = createClient();
  const [devices, setDevices] = useState<
    Array<{ id: string; name: string; device_type: string }>
  >([]);
  const [deviceId, setDeviceId] = useState("");
  const [metricName, setMetricName] = useState("");
  const [metricNames, setMetricNames] = useState<string[]>([]);
  const [range, setRange] = useState<Range>("24h");
  const [data, setData] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("av_devices")
      .select("id, name, device_type")
      .order("name")
      .then(({ data }) => {
        setDevices(data ?? []);
        if (data?.[0]) setDeviceId(data[0].id);
      });
  }, [supabase]);

  useEffect(() => {
    if (!deviceId) return;
    supabase
      .from("metrics")
      .select("name")
      .eq("device_id", deviceId)
      .then(({ data }) => {
        const names = [...new Set((data ?? []).map((m) => m.name))].sort();
        setMetricNames(names);
        if (names.length && !names.includes(metricName)) {
          setMetricName(names[0]);
        }
      });
  }, [deviceId, supabase, metricName]);

  useEffect(() => {
    if (!deviceId || !metricName) {
      setData([]);
      return;
    }

    const hours = range === "24h" ? 24 : range === "7d" ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    setLoading(true);
    supabase
      .from("metrics")
      .select("recorded_at, value_numeric")
      .eq("device_id", deviceId)
      .eq("name", metricName)
      .gte("recorded_at", since)
      .not("value_numeric", "is", null)
      .order("recorded_at")
      .then(({ data: rows }) => {
        setData(
          (rows ?? []).map((r) => ({
            ts: r.recorded_at,
            value: r.value_numeric as number,
          })),
        );
        setLoading(false);
      });
  }, [deviceId, metricName, range, supabase]);

  const selectedDevice = devices.find((d) => d.id === deviceId);
  const typeLabel = DEVICE_TYPES.find((t) => t.id === selectedDevice?.device_type)?.label;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Explorador de métricas</h2>
        <p className="text-muted mt-1">
          Gráficos temporales del equipamiento AV monitorizado.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-card bg-card p-4">
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="rounded-lg border border-card bg-[#0a0f1a] px-3 py-2 text-sm min-w-[200px]"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          className="rounded-lg border border-card bg-[#0a0f1a] px-3 py-2 text-sm min-w-[180px]"
        >
          {metricNames.length === 0 && <option value="">Sin métricas</option>}
          {metricNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-card overflow-hidden">
          {(["24h", "7d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-2 text-sm ${
                range === r ? "bg-blue-600 text-white" : "bg-[#0a0f1a] text-muted hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-card bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold">{selectedDevice?.name ?? "—"}</p>
            <p className="text-xs text-muted">
              {typeLabel} · {metricName || "Selecciona métrica"}
            </p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
        </div>
        <MetricsChart
          series={[{ name: metricName || "métrica", data, color: "#3b82f6" }]}
          height={360}
        />
      </div>
    </div>
  );
}
