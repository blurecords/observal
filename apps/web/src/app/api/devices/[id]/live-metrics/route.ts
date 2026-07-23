import { buildRouterSnapshot } from "@/lib/router-metrics";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: device } = await supabase
    .from("av_devices")
    .select("id, profile, last_seen_at")
    .eq("id", id)
    .single();

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const historySince = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [{ data: recent }, { data: history }] = await Promise.all([
    supabase
      .from("metrics")
      .select("name, value_numeric, value_text, value_bool, labels, recorded_at")
      .eq("device_id", id)
      .like("name", "router.%")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(500),
    supabase
      .from("metrics")
      .select("name, value_numeric, value_text, value_bool, labels, recorded_at")
      .eq("device_id", id)
      .eq("name", "router.interface.rx_bps")
      .gte("recorded_at", historySince)
      .order("recorded_at", { ascending: true })
      .limit(1000),
  ]);

  const snapshot = buildRouterSnapshot(recent ?? [], history ?? []);

  return NextResponse.json({
    ...snapshot,
    lastSeenAt: device.last_seen_at,
    profile: device.profile,
  });
}
