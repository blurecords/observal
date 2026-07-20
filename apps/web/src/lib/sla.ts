export interface DeviceUptimeRow {
  deviceId: string;
  deviceName: string;
  roomName: string | null;
  samples: number;
  onlineSamples: number;
  uptimePct: number | null;
}

export function computeUptimePct(online: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((online / total) * 1000) / 10;
}

export function computeOverallUptime(rows: DeviceUptimeRow[]): number | null {
  const withData = rows.filter((r) => r.samples > 0);
  if (!withData.length) return null;

  const totalSamples = withData.reduce((s, r) => s + r.samples, 0);
  const onlineSamples = withData.reduce((s, r) => s + r.onlineSamples, 0);
  return computeUptimePct(onlineSamples, totalSamples);
}

export function periodLabelForMonth(year: number, month: number): string {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  const fmt = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
  return `${fmt.format(start)} (${start.getUTCDate()}–${end.getUTCDate()})`;
}

export function lastCompleteMonthRange(now = new Date()): {
  start: Date;
  end: Date;
  year: number;
  month: number;
  label: string;
} {
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { start, end, year, month, label: periodLabelForMonth(year, month) };
}

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
