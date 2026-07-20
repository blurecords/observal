import { toCsv } from "@/lib/csv";
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
      .select("value_bool, recorded_at")
      .eq("device_id", device.id)
      .eq("name", "device.reachable")
      .gte("recorded_at", since);

    const samples = metrics ?? [];
    const online = samples.filter((m) => m.value_bool === true).length;
    const total = samples.length;
    const uptimePct = total > 0 ? Math.round((online / total) * 100) : null;
    const room = relationName(device.rooms as { name: string } | { name: string }[] | null);

    rows.push([
      device.name,
      room ?? "",
      device.last_status ?? "unknown",
      uptimePct ?? "—",
      total,
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
