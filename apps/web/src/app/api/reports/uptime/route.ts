import { toCsv } from "@/lib/csv";
import { computeUptimeFromMetrics, computeUptimePct } from "@/lib/sla";
import { relationName } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: devices } = await supabase
    .from("av_devices")
    .select("id, name, last_status, rooms(name)")
    .eq("enabled", true)
    .order("name");

  const rows: Array<Array<string | number>> = [];

  for (const device of devices ?? []) {
    const { data: metrics } = await supabase
      .from("metrics")
      .select("name, value_bool, value_text")
      .eq("device_id", device.id)
      .in("name", ["device.reachable", "snmp.reachable", "tcp.port_open", "projector.power"])
      .gte("recorded_at", since);

    const { samples, onlineSamples } = computeUptimeFromMetrics(metrics ?? []);
    const uptimePct = computeUptimePct(onlineSamples, samples);
    const room = relationName(device.rooms as { name: string } | { name: string }[] | null);

    rows.push([
      device.name,
      room ?? "",
      device.last_status ?? "unknown",
      uptimePct ?? "—",
      samples,
    ]);
  }

  const csv = toCsv(
    ["device", "room", "current_status", "uptime_pct_7d", "samples"],
    rows,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="observal-uptime-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
