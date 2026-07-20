import { AUDIT_ACTION_LABELS, type AuditAction } from "@/lib/audit";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .single();

  if (!profile || profile.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: entries } = await supabase
    .from("audit_log")
    .select("action, summary, created_at, profiles(full_name)")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (entries ?? []).map((e) => {
    const profileRel = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
    const actionLabel =
      AUDIT_ACTION_LABELS[e.action as AuditAction] ?? e.action;
    return [
      new Date(e.created_at).toISOString(),
      actionLabel,
      e.summary,
      profileRel?.full_name ?? "",
    ];
  });

  const csv = toCsv(["timestamp", "action", "summary", "user"], rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="observal-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
