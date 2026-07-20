export const UPTIME_METRIC_PRIORITY = [
  "device.reachable",
  "snmp.reachable",
  "tcp.port_open",
] as const;

export interface UptimeMetricRow {
  name: string;
  value_bool: boolean | null;
  value_text: string | null;
}

export function pickUptimeMetrics(metrics: UptimeMetricRow[]): UptimeMetricRow[] {
  for (const name of UPTIME_METRIC_PRIORITY) {
    const filtered = metrics.filter((m) => m.name === name);
    if (filtered.length > 0) return filtered;
  }
  return metrics.filter((m) => m.name === "projector.power");
}

export function isOnlineSample(metric: UptimeMetricRow): boolean {
  if (
    metric.name === "device.reachable" ||
    metric.name === "snmp.reachable" ||
    metric.name === "tcp.port_open"
  ) {
    return metric.value_bool === true;
  }
  if (metric.name === "projector.power") {
    return metric.value_text !== "offline" && metric.value_text !== "off";
  }
  return false;
}

export function computeUptimeFromMetrics(metrics: UptimeMetricRow[]): {
  samples: number;
  onlineSamples: number;
} {
  const picked = pickUptimeMetrics(metrics);
  let onlineSamples = 0;
  for (const m of picked) {
    if (isOnlineSample(m)) onlineSamples++;
  }
  return { samples: picked.length, onlineSamples };
}
