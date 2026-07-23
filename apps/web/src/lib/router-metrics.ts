export interface RouterInterfaceSnapshot {
  name: string;
  type?: string;
  up: boolean;
  rxBps?: number;
  txBps?: number;
  rxBytes?: number;
  txBytes?: number;
  mtu?: number;
  rxPackets?: number;
  txPackets?: number;
  rxDrops?: number;
  txDrops?: number;
  rxErrors?: number;
  txErrors?: number;
  linkDowns?: number;
  comment?: string;
  mac?: string;
}

export interface RouterSystemSnapshot {
  cpuLoad?: number;
  memoryUsedPct?: number;
  memoryFreeBytes?: number;
  memoryTotalBytes?: number;
  uptimeSec?: number;
  temperature?: number;
  cpuCount?: number;
  diskFreeBytes?: number;
  diskTotalBytes?: number;
  diskUsedPct?: number;
  connectionsCount?: number;
  healthVoltage?: number;
  version?: string;
  boardName?: string;
  identity?: string;
  platform?: string;
  architecture?: string;
  ipAddressesCount?: number;
  routesCount?: number;
  dhcpLeasesCount?: number;
}

export interface RouterLiveSnapshot {
  updatedAt: string | null;
  system: RouterSystemSnapshot;
  interfaces: RouterInterfaceSnapshot[];
  trafficHistory: Array<{
    name: string;
    data: Array<{ ts: string; value: number }>;
  }>;
  txTrafficHistory: Array<{
    name: string;
    data: Array<{ ts: string; value: number }>;
  }>;
  cpuHistory: Array<{ ts: string; value: number }>;
  memoryHistory: Array<{ ts: string; value: number }>;
}

type MetricRow = {
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  value_bool: boolean | null;
  labels: Record<string, string> | null;
  recorded_at: string;
};

function latestByName(rows: MetricRow[]): Map<string, MetricRow> {
  const map = new Map<string, MetricRow>();
  for (const row of rows) {
    const key = `${row.name}:${row.labels?.interface ?? ""}`;
    const prev = map.get(key);
    if (!prev || new Date(row.recorded_at) > new Date(prev.recorded_at)) {
      map.set(key, row);
    }
  }
  return map;
}

function readNumeric(row: MetricRow | undefined): number | undefined {
  if (!row || row.value_numeric == null) return undefined;
  return row.value_numeric;
}

function readText(row: MetricRow | undefined): string | undefined {
  if (!row?.value_text) return undefined;
  return row.value_text;
}

function readBool(row: MetricRow | undefined): boolean | undefined {
  if (!row || row.value_bool == null) return undefined;
  return row.value_bool;
}

function buildTimeSeries(
  rows: MetricRow[],
  metricName: string,
  interfaceName?: string,
): Array<{ ts: string; value: number }> {
  return rows
    .filter((row) => {
      if (row.name !== metricName || row.value_numeric == null) return false;
      if (interfaceName) return row.labels?.interface === interfaceName;
      return !row.labels?.interface;
    })
    .map((row) => ({ ts: row.recorded_at, value: row.value_numeric as number }))
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

export function buildRouterSnapshot(
  rows: MetricRow[],
  historyRows: MetricRow[],
): RouterLiveSnapshot {
  const latest = latestByName(rows);
  const system: RouterSystemSnapshot = {
    cpuLoad: readNumeric(latest.get("router.cpu_load:")),
    memoryUsedPct: readNumeric(latest.get("router.memory_used_pct:")),
    memoryFreeBytes: readNumeric(latest.get("router.memory_free_bytes:")),
    memoryTotalBytes: readNumeric(latest.get("router.memory_total_bytes:")),
    uptimeSec: readNumeric(latest.get("router.uptime_sec:")),
    temperature: readNumeric(latest.get("router.temperature:")),
    cpuCount: readNumeric(latest.get("router.cpu_count:")),
    diskFreeBytes: readNumeric(latest.get("router.disk_free_bytes:")),
    diskTotalBytes: readNumeric(latest.get("router.disk_total_bytes:")),
    diskUsedPct: readNumeric(latest.get("router.disk_used_pct:")),
    connectionsCount: readNumeric(latest.get("router.connections_count:")),
    healthVoltage: readNumeric(latest.get("router.health_voltage:")),
    version: readText(latest.get("router.version:")),
    boardName: readText(latest.get("router.board_name:")),
    identity: readText(latest.get("router.identity:")),
    platform: readText(latest.get("router.platform:")),
    architecture: readText(latest.get("router.architecture:")),
    ipAddressesCount: readNumeric(latest.get("router.ip_addresses_count:")),
    routesCount: readNumeric(latest.get("router.routes_count:")),
    dhcpLeasesCount: readNumeric(latest.get("router.dhcp_leases_count:")),
  };

  const interfaceNames = new Set<string>();
  for (const [key] of latest) {
    const match = key.match(/^router\.interface\.[^:]+:(.+)$/);
    if (match?.[1]) interfaceNames.add(match[1]);
  }

  const interfaces: RouterInterfaceSnapshot[] = [...interfaceNames]
    .sort()
    .map((name) => ({
      name,
      type: readText(latest.get(`router.interface.type:${name}`)),
      up: readBool(latest.get(`router.interface.up:${name}`)) ?? false,
      rxBps: readNumeric(latest.get(`router.interface.rx_bps:${name}`)),
      txBps: readNumeric(latest.get(`router.interface.tx_bps:${name}`)),
      rxBytes: readNumeric(latest.get(`router.interface.rx_bytes:${name}`)),
      txBytes: readNumeric(latest.get(`router.interface.tx_bytes:${name}`)),
      mtu: readNumeric(latest.get(`router.interface.mtu:${name}`)),
      rxPackets: readNumeric(latest.get(`router.interface.rx_packets:${name}`)),
      txPackets: readNumeric(latest.get(`router.interface.tx_packets:${name}`)),
      rxDrops: readNumeric(latest.get(`router.interface.rx_drops:${name}`)),
      txDrops: readNumeric(latest.get(`router.interface.tx_drops:${name}`)),
      rxErrors: readNumeric(latest.get(`router.interface.rx_errors:${name}`)),
      txErrors: readNumeric(latest.get(`router.interface.tx_errors:${name}`)),
      linkDowns: readNumeric(latest.get(`router.interface.link_downs:${name}`)),
      comment: readText(latest.get(`router.interface.comment:${name}`)),
      mac: readText(latest.get(`router.interface.mac:${name}`)),
    }))
    .sort((a, b) => Number(b.up) - Number(a.up) || a.name.localeCompare(b.name));

  const trafficByInterface = new Map<string, Array<{ ts: string; value: number }>>();
  const txTrafficByInterface = new Map<string, Array<{ ts: string; value: number }>>();
  for (const row of historyRows) {
    const iface = row.labels?.interface;
    if (!iface || row.value_numeric == null) continue;
    if (row.name === "router.interface.rx_bps") {
      const list = trafficByInterface.get(iface) ?? [];
      list.push({ ts: row.recorded_at, value: row.value_numeric });
      trafficByInterface.set(iface, list);
    }
    if (row.name === "router.interface.tx_bps") {
      const list = txTrafficByInterface.get(iface) ?? [];
      list.push({ ts: row.recorded_at, value: row.value_numeric });
      txTrafficByInterface.set(iface, list);
    }
  }

  const sortByLatest = (
    entries: Map<string, Array<{ ts: string; value: number }>>,
  ) =>
    [...entries.entries()]
      .map(([name, data]) => ({ name, data: data.sort((a, b) => a.ts.localeCompare(b.ts)) }))
      .filter((s) => s.data.length > 0)
      .sort((a, b) => {
        const aLast = a.data[a.data.length - 1]?.value ?? 0;
        const bLast = b.data[b.data.length - 1]?.value ?? 0;
        return bLast - aLast;
      })
      .slice(0, 6);

  const trafficHistory = sortByLatest(trafficByInterface);
  const txTrafficHistory = sortByLatest(txTrafficByInterface);

  const cpuHistory = buildTimeSeries(historyRows, "router.cpu_load");
  const memoryHistory = buildTimeSeries(historyRows, "router.memory_used_pct");

  const updatedAt =
    rows.length > 0
      ? rows.reduce((max, row) =>
          row.recorded_at > max ? row.recorded_at : max,
        rows[0].recorded_at)
      : null;

  return { updatedAt, system, interfaces, trafficHistory, txTrafficHistory, cpuHistory, memoryHistory };
}

export function formatBps(value: number | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Gbps`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mbps`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} Kbps`;
  return `${Math.round(value)} bps`;
}

export function formatBytes(value: number | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} GB`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} KB`;
  return `${value} B`;
}

export function formatUptime(seconds: number | undefined): string {
  if (seconds == null) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatNumber(value: number | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("es-ES");
}

export function formatPercent(value: number | undefined, digits = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}
