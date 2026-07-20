import { DEVICE_TYPES, PROFILE_LABELS } from "@/lib/av-catalog";
import { toCsv } from "@/lib/csv";
import { relationName } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: devices } = await supabase
    .from("av_devices")
    .select("name, device_type, host, profile, brand, model, last_status, critical, enabled, rooms(name), venues(name)")
    .order("name");

  const typeLabels = Object.fromEntries(DEVICE_TYPES.map((t) => [t.id, t.label]));

  const rows = (devices ?? []).map((d) => {
    const room = relationName(d.rooms as { name: string } | { name: string }[] | null);
    const venue = relationName(d.venues as { name: string } | { name: string }[] | null);
    return [
      d.name,
      typeLabels[d.device_type] ?? d.device_type,
      d.host,
      PROFILE_LABELS[d.profile as keyof typeof PROFILE_LABELS] ?? d.profile,
      d.brand ?? "",
      d.model ?? "",
      venue ?? "",
      room ?? "",
      d.last_status,
      d.critical ? "yes" : "no",
      d.enabled ? "yes" : "no",
    ];
  });

  const csv = toCsv(
    ["name", "type", "host", "profile", "brand", "model", "venue", "room", "status", "critical", "enabled"],
    rows,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="observal-inventario-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
