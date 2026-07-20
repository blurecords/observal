import { toCsv } from "@/lib/csv";
import { relationName } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: alerts } = await supabase
    .from("alerts")
    .select("title, severity, rule_key, triggered_at, resolved, resolved_at, av_devices(name)")
    .gte("triggered_at", since)
    .order("triggered_at", { ascending: false });

  const rows = (alerts ?? []).map((a) => {
    const device = relationName(
      a.av_devices as { name: string } | { name: string }[] | null,
    );
    return [
      a.triggered_at,
      a.severity,
      a.rule_key ?? "",
      a.title,
      device ?? "",
      a.resolved ? "yes" : "no",
      a.resolved_at ?? "",
    ];
  });

  const csv = toCsv(
    ["triggered_at", "severity", "rule", "title", "device", "resolved", "resolved_at"],
    rows,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="observal-alertas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
